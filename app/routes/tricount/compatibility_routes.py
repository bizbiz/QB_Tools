# app/routes/tricount/compatibility_routes.py
"""
Routes de compatibilité pour maintenir les anciennes URL fonctionnelles
Ces routes redirigent les anciennes URL vers les nouvelles URL
Particulièrement utile pour les appels JavaScript qui utilisent les anciennes routes

Chaque appel est enregistré dans la table ErrorFollowing pour faciliter
l'identification et la correction des appels obsolètes.
"""
from flask import request, redirect, url_for, jsonify, current_app
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense
import traceback
import json
from datetime import datetime

# Import ErrorFollowing de manière défensive
try:
    from app.models.error_following import ErrorFollowing
    error_following_available = True
except ImportError:
    error_following_available = False
    # Créer une classe de remplacement pour éviter les erreurs
    class ErrorFollowing:
        @staticmethod
        def log_redirect(*args, **kwargs):
            pass

def log_compatibility_call(original_route, target_route, route_type="API", additional_info=None):
    """
    Enregistre un appel à une route de compatibilité dans ErrorFollowing
    
    Args:
        original_route (str): Route originale appelée
        target_route (str): Nouvelle route vers laquelle on redirige
        route_type (str): Type de route (API, page, etc.)
        additional_info (dict): Informations supplémentaires à enregistrer
    """
    if not error_following_available:
        # Si ErrorFollowing n'est pas disponible, on affiche un message dans les logs
        current_app.logger.warning(
            f"Route de compatibilité utilisée: {original_route} -> {target_route}"
        )
        return
    
    try:
        # Collecter des informations détaillées sur l'appel
        info = {
            "timestamp": datetime.utcnow().isoformat(),
            "method": request.method,
            "referrer": request.referrer or "Unknown",
            "user_agent": request.user_agent.string,
            "remote_addr": request.remote_addr,
            "route_type": route_type,
            "args": dict(request.args),
            "form": dict(request.form) if request.form else None,
            "json": request.json if request.is_json else None
        }
        
        # Ajouter les informations supplémentaires si fournies
        if additional_info:
            info.update(additional_info)
        
        # Créer une entrée dans ErrorFollowing
        error_entry = ErrorFollowing(
            error_type="redirection",
            source=original_route,
            message=f"Redirection de compatibilité: {original_route} -> {target_route}",
            stack_trace=json.dumps(info, indent=2)
        )
        
        db.session.add(error_entry)
        db.session.commit()
    except Exception as e:
        # Ne pas laisser une erreur dans la journalisation perturber l'exécution normale
        current_app.logger.error(f"Erreur lors de la journalisation de redirection: {str(e)}")
        db.session.rollback()

# Compatibilité pour les routes de détail d'expense
@tricount_bp.route('/expense/<int:expense_type>/detail/<int:expense_id>', methods=['GET'])
def legacy_expense_detail(expense_type, expense_id):
    """
    Redirige les anciennes routes /expense/{type}/detail/{id} vers les nouvelles
    Maintient la compatibilité avec le JavaScript existant
    """
    # Enregistrer l'appel pour analyse future
    original_route = f"/tricount/expense/{expense_type}/detail/{expense_id}"
    target_route = f"/tricount/expense/{expense_id}/details"
    
    log_compatibility_call(
        original_route, 
        target_route,
        route_type="AJAX",
        additional_info={
            "expense_id": expense_id,
            "expense_type": expense_type,
            "stack": traceback.format_stack()
        }
    )
    
    try:
        expense = Expense.query.get_or_404(expense_id)
        
        # Import local pour éviter les cycles d'import
        try:
            from app.routes.tricount.expense_details_routes import prepare_expense_response_data
            expense_data = prepare_expense_response_data(expense)
        except ImportError:
            # Fallback si le nouveau module n'est pas disponible
            expense_data = {
                'id': expense.id,
                'date': expense.date.strftime('%d/%m/%Y'),
                'merchant': expense.merchant,
                'renamed_merchant': expense.renamed_merchant,
                'description': expense.description,
                'notes': expense.notes,
                'amount': float(expense.amount),
                'is_debit': expense.is_debit,
                'category_id': expense.category_id,
                'flag_id': expense.flag_id,
                'declaration_status': expense.declaration_status,
                'is_declared': expense.declaration_status != "not_declared",
                'is_reimbursed': expense.declaration_status == "reimbursed",
            }
        
        return jsonify({
            'success': True,
            'expense': expense_data
        })
    except Exception as e:
        current_app.logger.error(f"Erreur dans legacy_expense_detail: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Compatibilité pour les routes d'update d'expense
@tricount_bp.route('/expense/<int:expense_type>/update/<int:expense_id>', methods=['POST'])
def legacy_expense_update(expense_type, expense_id):
    """
    Redirige les anciennes routes /expense/{type}/update/{id} vers les nouvelles
    Maintient la compatibilité avec le JavaScript existant
    """
    # Enregistrer l'appel pour analyse future
    original_route = f"/tricount/expense/{expense_type}/update/{expense_id}"
    target_route = f"/tricount/expense/{expense_id}/update"
    
    log_compatibility_call(
        original_route, 
        target_route,
        route_type="AJAX",
        additional_info={
            "expense_id": expense_id,
            "expense_type": expense_type,
            "form_data": dict(request.form),
            "stack": traceback.format_stack()
        }
    )
    
    try:
        from app.routes.tricount.expense_details_routes import update_expense_details
        return update_expense_details(expense_id)
    except ImportError:
        # Fallback vers l'ancienne implémentation si le nouveau module n'est pas disponible
        try:
            expense = Expense.query.get_or_404(expense_id)
            
            # Récupérer les données du formulaire
            renamed_merchant = request.form.get('renamed_merchant', '')
            notes = request.form.get('notes', '')
            category_id = request.form.get('category_id')
            flag_id = request.form.get('flag_id')
            is_declared = request.form.get('is_declared') == 'true'
            is_reimbursed = request.form.get('is_reimbursed') == 'true'
            declaration_reference = request.form.get('declaration_reference', '')
            
            # Mettre à jour uniquement si les valeurs ont changé
            current_renamed = expense.renamed_merchant or ''
            if renamed_merchant != current_renamed:
                expense.renamed_merchant = renamed_merchant or None
                expense.merchant_modified_by = "manual"
            
            current_notes = expense.notes or ''
            if notes != current_notes:
                expense.notes = notes or None
                expense.notes_modified_by = "manual"
            
            # Mise à jour de la catégorie si elle a changé
            if category_id and str(expense.category_id) != str(category_id):
                expense.category_id = category_id
                expense.category_modified_by = "manual"
            
            # Mise à jour du flag si il a changé
            if flag_id and str(expense.flag_id) != str(flag_id):
                expense.flag_id = flag_id
                expense.flag_modified_by = "manual"
            
            # Mise à jour du statut de déclaration
            if is_declared and expense.declaration_status == "not_declared":
                expense.declaration_status = "declared"
                if not expense.declaration_date:
                    expense.declaration_date = datetime.utcnow()
            elif is_reimbursed:
                expense.declaration_status = "reimbursed"
                if not expense.declaration_date:
                    expense.declaration_date = datetime.utcnow()
                if not expense.reimbursement_date:
                    expense.reimbursement_date = datetime.utcnow()
            elif not is_declared and expense.declaration_status != "not_declared":
                expense.declaration_status = "not_declared"
                expense.declaration_date = None
                expense.reimbursement_date = None
            
            # Mise à jour de la référence
            expense.declaration_reference = declaration_reference
            
            # Sauvegarder les modifications
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Dépense mise à jour avec succès'
            })
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Erreur dans legacy_expense_update: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

# Compatibilité pour les routes de mise à jour de status
@tricount_bp.route('/expense/<int:expense_type>/update-status/<int:expense_id>', methods=['POST'])
def legacy_expense_status_update(expense_type, expense_id):
    """
    Redirige les anciennes routes /expense/{type}/update-status/{id} vers les nouvelles
    Maintient la compatibilité avec le JavaScript existant
    """
    # Enregistrer l'appel pour analyse future
    original_route = f"/tricount/expense/{expense_type}/update-status/{expense_id}"
    target_route = f"/tricount/expense/update-status/{expense_id}"
    
    log_compatibility_call(
        original_route, 
        target_route,
        route_type="AJAX",
        additional_info={
            "expense_id": expense_id,
            "expense_type": expense_type,
            "form_data": dict(request.form),
            "stack": traceback.format_stack()
        }
    )
    
    try:
        from app.routes.tricount.expense_status_routes import update_expense_status
        return update_expense_status(expense_id)
    except ImportError:
        # Fallback si le nouveau module n'est pas disponible
        current_app.logger.error("Module expense_status_routes non disponible")
        return jsonify({
            'success': False,
            'error': "Fonction non disponible"
        }), 500

# Compatibilité pour les routes d'historique d'expense
@tricount_bp.route('/expense/<int:expense_type>/history/<int:expense_id>', methods=['GET'])
def legacy_expense_history(expense_type, expense_id):
    """
    Redirige les anciennes routes /expense/{type}/history/{id} vers les nouvelles
    Maintient la compatibilité avec le JavaScript existant
    """
    # Enregistrer l'appel pour analyse future
    original_route = f"/tricount/expense/{expense_type}/history/{expense_id}"
    target_route = f"/tricount/reimbursements/expense-history/{expense_id}"
    
    log_compatibility_call(
        original_route, 
        target_route,
        route_type="AJAX",
        additional_info={
            "expense_id": expense_id,
            "expense_type": expense_type,
            "stack": traceback.format_stack()
        }
    )
    
    try:
        from app.routes.tricount.expense_history_routes import get_expense_history
        return get_expense_history(expense_id)
    except ImportError:
        current_app.logger.error("Module expense_history_routes non disponible")
        return jsonify({
            'success': False,
            'error': "Fonction non disponible"
        }), 500

# Compatibilité pour l'ancienne route de mise à jour des dépenses
@tricount_bp.route('/update_expense', methods=['POST'])
def legacy_update_expense_general():
    """
    Redirige l'ancienne route /update_expense vers la nouvelle
    Maintient la compatibilité avec le JavaScript existant
    """
    expense_id = request.form.get('expense_id')
    if not expense_id:
        return jsonify({'success': False, 'error': 'ID de dépense manquant'}), 400
    
    # Enregistrer l'appel pour analyse future
    original_route = f"/tricount/update_expense"
    target_route = f"/tricount/expense/{expense_id}/update"
    
    log_compatibility_call(
        original_route, 
        target_route,
        route_type="AJAX",
        additional_info={
            "expense_id": expense_id,
            "form_data": dict(request.form),
            "stack": traceback.format_stack()
        }
    )
    
    try:
        from app.routes.tricount.expense_details_routes import update_expense_details
        return update_expense_details(expense_id)
    except ImportError:
        # Utiliser le fallback dans legacy_expense_update
        return legacy_expense_update(0, expense_id)

# Compatibilité pour les routes de règles auto
@tricount_bp.route('/auto-rule/apply/<int:rule_id>', methods=['POST'])
def legacy_apply_auto_rule(rule_id):
    """
    Redirige l'ancienne route /auto-rule/apply/{id} vers la nouvelle
    Maintient la compatibilité avec le JavaScript existant
    """
    # Enregistrer l'appel pour analyse future
    original_route = f"/tricount/auto-rule/apply/{rule_id}"
    target_route = f"/tricount/auto-rules/apply/{rule_id}"
    
    log_compatibility_call(
        original_route, 
        target_route,
        route_type="AJAX",
        additional_info={
            "rule_id": rule_id,
            "form_data": dict(request.form),
            "stack": traceback.format_stack()
        }
    )
    
    try:
        from app.routes.tricount.auto_rules_application import apply_auto_rule
        return apply_auto_rule(rule_id)
    except ImportError:
        current_app.logger.error("Module auto_rules_application non disponible")
        return redirect(url_for('tricount.auto_rules_list'))

# Template compatibility route - pour détecter les appels depuis les templates
@tricount_bp.route('/template-compatibility/<path:path>')
def template_compatibility(path):
    """
    Route spéciale pour identifier les appels depuis les templates
    Cette route ne fait que journaliser l'appel et rediriger vers la nouvelle URL
    Elle est utile pour identifier les templates qui utilisent d'anciennes URLs
    
    Usage: Dans vos templates, remplacez:
    <a href="{{ url_for('tricount.old_route') }}">...</a>
    par:
    <a href="{{ url_for('tricount.template_compatibility', path='old_route') }}">...</a>
    """
    # Construire les infos de redirection
    original_route = f"/tricount/template-compatibility/{path}"
    target_route = f"/tricount/{path}"
    
    # Collecter toutes les informations de l'appel
    referrer_info = {
        "referrer": request.referrer,
        "blueprint": "tricount",
        "endpoint": path,
        "arguments": dict(request.args),
        "user_agent": request.user_agent.string,
        "source_type": "template"
    }
    
    # Journaliser avec toutes les infos
    log_compatibility_call(
        original_route,
        target_route,
        route_type="TEMPLATE",
        additional_info=referrer_info
    )
    
    # Construire l'URL complète pour la redirection
    # On préserve tous les paramètres de requête
    query_string = request.query_string.decode('utf-8')
    redirect_url = f"/tricount/{path}"
    if query_string:
        redirect_url += f"?{query_string}"
    
    # Rediriger vers la nouvelle URL
    return redirect(redirect_url)