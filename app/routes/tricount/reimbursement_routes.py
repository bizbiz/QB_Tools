# app/routes/tricount/reimbursement_routes.py
from flask import render_template, redirect, url_for, flash, request, jsonify
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense, Flag, Category, DeclarationStatus, ReimbursementType, AutoCategorizationRule
from datetime import datetime
from sqlalchemy import or_, case, func
import json
import traceback

# Fonction utilitaire pour préparer les données JavaScript des catégories
def prepare_category_data(categories, flags):
    """
    Prépare les données des catégories pour JavaScript
    
    Args:
        categories (list): Liste des catégories
        flags (list): Liste des flags
        
    Returns:
        dict: Dictionnaire des données de catégories
    """
    # Créer un dictionnaire des flags par ID pour un accès rapide
    flags_by_id = {flag.id: flag for flag in flags}
    
    # Préparer les données de catégorie pour JavaScript
    category_data = {}
    for category in categories:
        # Récupérer les IDs des flags associés à cette catégorie
        flag_ids = [flag.id for flag in category.flags]
        
        # Préparer les données d'icône
        icon_data = {}
        if hasattr(category, 'iconify_id') and category.iconify_id:
            icon_data['iconify_id'] = category.iconify_id
        elif hasattr(category, 'legacy_icon') and category.legacy_icon:
            icon_data['icon_class'] = category.legacy_icon
        
        # Ajouter les données de cette catégorie
        category_data[category.id] = {
            'id': category.id,
            'name': category.name,
            'color': category.color if hasattr(category, 'color') else '#e9ecef',
            'flagIds': flag_ids,
            **icon_data
        }
    
    return category_data

def calculate_summary(expenses):
    """
    Calcule les statistiques des dépenses remboursables
    
    Args:
        expenses (list): Liste des dépenses remboursables
    
    Returns:
        dict: Dictionnaire contenant les statistiques
    """
    total_amount = 0
    total_declared = 0
    total_reimbursed = 0
    
    for expense in expenses:
        if expense.is_debit:
            total_amount += float(expense.amount)
            if expense.declaration_status == DeclarationStatus.DECLARED.value:
                total_declared += float(expense.amount)
            elif expense.declaration_status == DeclarationStatus.REIMBURSED.value:
                total_reimbursed += float(expense.amount)
    
    # Calculer le pourcentage déclaré
    percentage_declared = 0
    if total_amount > 0:
        percentage_declared = (total_declared + total_reimbursed) / total_amount * 100
    
    return {
        'total_amount': total_amount,
        'total_declared': total_declared,
        'total_reimbursed': total_reimbursed,
        'percentage_declared': percentage_declared
    }

def apply_sort_to_query(query, expense_model, sort_by, order):
    """
    Applique le tri à la requête en fonction des paramètres
    
    Args:
        query: Requête SQLAlchemy
        expense_model: Modèle Expense
        sort_by (str): Champ par lequel trier
        order (str): Ordre du tri ('asc' ou 'desc')
        
    Returns:
        query: Requête avec tri appliqué
    """
    # Déterminer la colonne à utiliser pour le tri
    if sort_by == 'date':
        column = expense_model.date
    elif sort_by == 'amount':
        column = expense_model.amount
    elif sort_by in ('merchant', 'description'):
        # Utiliser le nom renommé s'il existe, sinon le nom original
        column = case(
            [(expense_model.renamed_merchant != None, func.lower(expense_model.renamed_merchant))],
            else_=func.lower(expense_model.merchant)
        )
    elif sort_by == 'status':
        column = expense_model.declaration_status
    else:
        # Par défaut, trier par date
        column = expense_model.date
        
    # Appliquer l'ordre de tri
    if order == 'asc':
        query = query.order_by(column.asc())
    else:
        query = query.order_by(column.desc())
        
    return query

@tricount_bp.route('/reimbursements', methods=['POST'])
def reimbursements_list():
    """Page de gestion des remboursements"""
    try:
        # Détecter si c'est une requête AJAX
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        
        # Récupérer les paramètres de filtrage
        flag_id = request.form.get('flag_id', type=int)
        status_values = request.form.getlist('status')  # Plusieurs statuts possibles
        start_date = request.form.get('start_date')
        end_date = request.form.get('end_date')
        search_query = request.form.get('search', '')
        show_all = request.form.get('show_all') == '1'  # Nouveau paramètre

        if 'flag_id' not in request.form:
            flag_id = None

        # Paramètres de tri
        sort_by = request.form.get('sort', 'date')
        order = request.form.get('order', 'desc')
        
        # Construire la requête de base
        query = Expense.query
        
        # Filtrage par type remboursable (si show_all est False)
        if not show_all:
            query = query.join(Flag).filter(
                Flag.reimbursement_type.in_([
                    ReimbursementType.PARTIALLY_REIMBURSABLE.value,
                    ReimbursementType.FULLY_REIMBURSABLE.value
                ])
            )
        else:
            # Sinon, juste joindre Flag sans filtrer, pour inclure toutes les dépenses
            query = query.join(Flag, isouter=True)
            
        # Filtre par flag spécifique
        if flag_id is not None and flag_id > 0:
            query = query.filter(Expense.flag_id == flag_id)
        
        # Filtre par statut de déclaration (multiple)
        if status_values:
            # Filtrer pour n'inclure que les dépenses dont le statut est dans la liste
            query = query.filter(Expense.declaration_status.in_(status_values))
        
        # Filtre par date
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(Expense.date >= start_date_obj)
            except ValueError:
                start_date = None
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                query = query.filter(Expense.date <= end_date_obj)
            except ValueError:
                end_date = None
        
        # Filtre par recherche textuelle
        if search_query:
            search_term = f"%{search_query}%"
            query = query.filter(
                or_(
                    Expense.merchant.ilike(search_term),
                    Expense.renamed_merchant.ilike(search_term),
                    Expense.description.ilike(search_term),
                    Expense.notes.ilike(search_term),
                    Expense.declaration_reference.ilike(search_term)
                )
            )
        
        # Appliquer le tri
        query = apply_sort_to_query(query, Expense, sort_by, order)
        
        # Récupérer tous les flags et les catégories
        flags = Flag.query.all()
        categories = Category.query.all()
        
        # Préparer les données JavaScript pour les catégories et les flags
        category_data = prepare_category_data(categories, flags)
        
        # Préparer les données JavaScript pour les flags
        flag_data = {}
        for flag in flags:
            flag_data[flag.id] = {
                'id': flag.id,
                'name': flag.name,
                'color': flag.color,
                'iconify_id': flag.iconify_id if hasattr(flag, 'iconify_id') else None,
                'legacy_icon': flag.legacy_icon if hasattr(flag, 'legacy_icon') else None,
                'reimbursement_type': flag.reimbursement_type if hasattr(flag, 'reimbursement_type') else None
            }
        
        # Calculer les totaux pour le résumé avant pagination
        all_expenses = query.all()
        summary = calculate_summary(all_expenses)
        
        # Pagination
        per_page = 20
        page = request.form.get('page', 1, type=int)
        expenses = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Si c'est une requête AJAX, renvoyer du JSON
        if is_ajax:
            # Préparer les données des dépenses pour le JSON
            expenses_data = []
            for expense in expenses.items:
                # Générer le HTML pour le badge du flag
                flag_html = None
                if expense.flag:
                    from flask import render_template_string
                    flag_html = render_template_string(
                        "{% from 'macros/tricount/flag_macros.html' import flag_badge %}{{ flag_badge(flag) }}",
                        flag=expense.flag
                    )
                
                # Ajouter les données de la dépense
                expense_data = {
                    'id': expense.id,
                    'date': expense.date.strftime('%d/%m/%Y'),
                    'merchant': expense.renamed_merchant if expense.renamed_merchant else expense.merchant,
                    'description': expense.description or '',
                    'amount': float(expense.amount),
                    'is_debit': expense.is_debit,
                    'flag_id': expense.flag_id,
                    'flag': expense.flag.name if expense.flag else None,
                    'flag_html': flag_html,
                    'is_declared': expense.declaration_status in [DeclarationStatus.DECLARED.value, DeclarationStatus.REIMBURSED.value],
                    'is_reimbursed': expense.declaration_status == DeclarationStatus.REIMBURSED.value,
                    'declaration_status': expense.declaration_status,
                    'is_reimbursable': expense.is_reimbursable
                }
                expenses_data.append(expense_data)
            
            # Préparer les données de pagination
            pagination_data = {
                'page': expenses.page,
                'pages': expenses.pages,
                'total': expenses.total,
                'has_prev': expenses.has_prev,
                'has_next': expenses.has_next,
                'prev_num': expenses.prev_num,
                'next_num': expenses.next_num
            }
            
            # Retourner les données JSON
            return jsonify({
                'success': True,
                'expenses': expenses_data,
                'summary': summary,
                'pagination': pagination_data
            })
        
        # Rendu du template normal
        return render_template('tricount/reimbursements.html',
                              expenses=expenses,
                              flags=flags,
                              categories=categories,
                              selected_flag_id=flag_id,
                              selected_status=status_values,
                              start_date=start_date,
                              end_date=end_date,
                              search_query=search_query,
                              sort_by=sort_by,
                              order=order,
                              summary=summary,
                              declaration_statuses=DeclarationStatus,
                              show_all=show_all,
                              category_data_json=json.dumps(category_data),
                              flag_data_json=json.dumps(flag_data))
    except Exception as e:
        # En cas d'erreur, capturer et journaliser l'exception
        error_msg = f"Erreur dans reimbursements_list: {str(e)}"
        traceback_str = traceback.format_exc()
        print(error_msg)
        print(traceback_str)
        
        # Si c'est une requête AJAX, renvoyer une erreur JSON
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'success': False,
                'error': str(e),
                'traceback': traceback_str
            }), 500
        
        # Sinon, afficher un message d'erreur
        flash(f"Une erreur s'est produite : {str(e)}", "danger")
        return redirect(url_for('tricount.index'))

@tricount_bp.route('/reimbursements', methods=['GET'])
def reimbursements_list_get():
    """Redirection de GET vers POST pour la même route avec des valeurs par défaut"""
    # Créer un formulaire avec des valeurs par défaut
    form_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Redirection...</title>
        <script>
            window.onload = function() {
                document.getElementById('redirectForm').submit();
            }
        </script>
    </head>
    <body>
        <form id="redirectForm" method="POST" action="/tricount/reimbursements">
            <!-- Valeurs par défaut pour le filtrage initial -->
            <input type="hidden" name="show_all" value="0">
            <input type="hidden" name="sort" value="date">
            <input type="hidden" name="order" value="desc">
            <input type="hidden" name="status" value="not_declared">
            <input type="hidden" name="status" value="declared">
            <input type="hidden" name="status" value="reimbursed">
        </form>
        <p>Redirection en cours...</p>
    </body>
    </html>
    """
    
    return form_html

@tricount_bp.route('/reimbursements/update/<int:expense_id>', methods=['POST'])
def update_reimbursement_status(expense_id):
    """API pour mettre à jour le statut de remboursement d'une dépense"""
    expense = Expense.query.get_or_404(expense_id)
    
    # Vérifier que la dépense est remboursable
    if not expense.is_reimbursable:
        return jsonify({
            'success': False,
            'error': 'Cette dépense n\'est pas remboursable'
        }), 400
    
    # Récupérer les données
    status = request.form.get('status')
    reference = request.form.get('reference', '')
    notes = request.form.get('notes', '')
    
    # Validation du statut
    valid_statuses = [status.value for status in DeclarationStatus]
    if status not in valid_statuses:
        return jsonify({
            'success': False,
            'error': f'Statut invalide. Les statuts valides sont: {", ".join(valid_statuses)}'
        }), 400
    
    # Mettre à jour le statut et autres informations
    expense.declaration_status = status
    
    # Ne mettre à jour la référence et les notes que si elles sont fournies
    if reference:
        expense.declaration_reference = reference
    if notes:
        expense.declaration_notes = notes
    
    # Mettre à jour les dates selon le statut
    if status == DeclarationStatus.DECLARED.value and not expense.declaration_date:
        expense.declaration_date = datetime.utcnow()
    elif status == DeclarationStatus.REIMBURSED.value and not expense.reimbursement_date:
        expense.reimbursement_date = datetime.utcnow()
        # Si la dépense est remboursée, elle est forcément déclarée
        if not expense.declaration_date:
            expense.declaration_date = datetime.utcnow()
    elif status == DeclarationStatus.NOT_DECLARED.value:
        expense.declaration_date = None
        expense.reimbursement_date = None
    
    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'expense': {
                'id': expense.id,
                'status': expense.declaration_status,
                'is_declared': expense.declaration_status in [DeclarationStatus.DECLARED.value, DeclarationStatus.REIMBURSED.value],
                'is_reimbursed': expense.declaration_status == DeclarationStatus.REIMBURSED.value,
                'declaration_date': expense.declaration_date.strftime('%d/%m/%Y') if expense.declaration_date else None,
                'reimbursement_date': expense.reimbursement_date.strftime('%d/%m/%Y') if expense.reimbursement_date else None
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tricount_bp.route('/reimbursements/bulk-update', methods=['POST'])
def bulk_update_reimbursement():
    """API pour mettre à jour le statut de plusieurs dépenses en une seule fois"""
    # Vérifier si les données sont envoyées en JSON ou en form-data
    if request.is_json:
        data = request.json
        expense_ids = data.get('expense_ids', [])
        status = data.get('status')
    else:
        expense_ids = request.form.getlist('expense_ids[]')
        status = request.form.get('status')
    
    # Validation du statut
    valid_statuses = [status.value for status in DeclarationStatus]
    if status not in valid_statuses:
        return jsonify({
            'success': False,
            'error': f'Statut invalide. Les statuts valides sont: {", ".join(valid_statuses)}'
        }), 400
    
    if not expense_ids:
        return jsonify({
            'success': False,
            'error': 'Aucune dépense sélectionnée'
        }), 400
    
    # Mettre à jour toutes les dépenses sélectionnées
    try:
        updated_count = 0
        skipped_count = 0
        
        for expense_id in expense_ids:
            expense = Expense.query.get(expense_id)
            if expense and expense.is_reimbursable:
                # Mettre à jour le statut
                expense.declaration_status = status
                
                # Mettre à jour les dates selon le statut
                if status == DeclarationStatus.DECLARED.value and not expense.declaration_date:
                    expense.declaration_date = datetime.utcnow()
                elif status == DeclarationStatus.REIMBURSED.value and not expense.reimbursement_date:
                    expense.reimbursement_date = datetime.utcnow()
                    # Si la dépense est remboursée, elle est forcément déclarée
                    if not expense.declaration_date:
                        expense.declaration_date = datetime.utcnow()
                elif status == DeclarationStatus.NOT_DECLARED.value:
                    expense.declaration_date = None
                    expense.reimbursement_date = None
                
                updated_count += 1
            else:
                skipped_count += 1
        
        db.session.commit()
        return jsonify({
            'success': True,
            'updated': updated_count,
            'skipped': skipped_count
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tricount_bp.route('/reimbursements/summary', methods=['GET', 'POST'])
def get_reimbursement_summary():
    """API pour récupérer les statistiques des remboursements"""
    # On peut recevoir des filtres pour calculer les stats sur un sous-ensemble
    flag_id = request.values.get('flag_id', type=int)
    status_values = request.values.getlist('status')
    start_date = request.values.get('start_date')
    end_date = request.values.get('end_date')
    search_query = request.values.get('search', '')
    
    # Construire la requête avec les mêmes filtres que la page principale
    query = Expense.query.join(Flag).filter(
        Flag.reimbursement_type.in_([
            ReimbursementType.PARTIALLY_REIMBURSABLE.value,
            ReimbursementType.FULLY_REIMBURSABLE.value
        ])
    )
    
    # Appliquer les filtres
    if flag_id is not None and flag_id > 0:
        query = query.filter(Expense.flag_id == flag_id)
    
    if status_values:
        query = query.filter(Expense.declaration_status.in_(status_values))
    
    if start_date:
        try:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Expense.date >= start_date_obj)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(Expense.date <= end_date_obj)
        except ValueError:
            pass
    
    if search_query:
        search_term = f"%{search_query}%"
        query = query.filter(
            or_(
                Expense.merchant.ilike(search_term),
                Expense.renamed_merchant.ilike(search_term),
                Expense.description.ilike(search_term),
                Expense.notes.ilike(search_term)
            )
        )
    
    # Récupérer les dépenses et calculer les statistiques
    expenses = query.all()
    summary = calculate_summary(expenses)
    
    return jsonify({
        'success': True,
        'summary': summary
    })

@tricount_bp.route('/reimbursements/export', methods=['GET', 'POST'])
def export_reimbursements():
    """Exporte les données de remboursement au format CSV"""
    import csv
    from flask import Response
    from io import StringIO
    
    # Utiliser les mêmes filtres que la page principale
    flag_id = request.values.get('flag_id', type=int)
    status_values = request.values.getlist('status')
    start_date = request.values.get('start_date')
    end_date = request.values.get('end_date')
    search_query = request.values.get('search', '')
    
    # Construire la requête avec les filtres
    query = Expense.query.join(Flag).filter(
        Flag.reimbursement_type.in_([
            ReimbursementType.PARTIALLY_REIMBURSABLE.value,
            ReimbursementType.FULLY_REIMBURSABLE.value
        ])
    )
    
    # Appliquer les filtres
    if flag_id is not None and flag_id > 0:
        query = query.filter(Expense.flag_id == flag_id)
    
    if status_values:
        query = query.filter(Expense.declaration_status.in_(status_values))
    
    if start_date:
        try:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Expense.date >= start_date_obj)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(Expense.date <= end_date_obj)
        except ValueError:
            pass
    
    if search_query:
        search_term = f"%{search_query}%"
        query = query.filter(
            or_(
                Expense.merchant.ilike(search_term),
                Expense.renamed_merchant.ilike(search_term),
                Expense.description.ilike(search_term),
                Expense.notes.ilike(search_term)
            )
        )
    
    # Récupérer les dépenses
    expenses = query.order_by(Expense.date.desc()).all()
    
    # Créer un CSV en mémoire
    output = StringIO()
    writer = csv.writer(output)
    
    # Écrire l'en-tête
    writer.writerow([
        'Date', 'Marchand', 'Description', 'Montant', 'Type', 'Statut', 
        'Date de déclaration', 'Date de remboursement', 'Référence'
    ])
    
    # Écrire les données
    for expense in expenses:
        status_text = {
            DeclarationStatus.NOT_DECLARED.value: 'Non déclarée',
            DeclarationStatus.DECLARED.value: 'Déclarée',
            DeclarationStatus.REIMBURSED.value: 'Remboursée'
        }.get(expense.declaration_status, 'Inconnu')
        
        writer.writerow([
            expense.date.strftime('%d/%m/%Y'),
            expense.renamed_merchant if expense.renamed_merchant else expense.merchant,
            expense.description,
            f"{expense.amount:.2f}",
            expense.flag.name if expense.flag else 'Non défini',
            status_text,
            expense.declaration_date.strftime('%d/%m/%Y') if expense.declaration_date else '',
            expense.reimbursement_date.strftime('%d/%m/%Y') if expense.reimbursement_date else '',
            expense.declaration_reference or ''
        ])
    
    # Renvoyer le CSV
    output.seek(0)
    return Response(
        output,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=remboursements.csv"}
    )

@tricount_bp.route('/reimbursements/expense/<int:expense_id>', methods=['GET'])
def get_expense_details(expense_id):
    """Récupère les détails d'une dépense pour le formulaire d'édition"""
    expense = Expense.query.get_or_404(expense_id)
    
    # Vérifier si une règle a été créée à partir de cette dépense
    rule = AutoCategorizationRule.query.filter_by(created_by_expense_id=expense_id).first()
    
    expense_data = {
        'id': expense.id,
        'date': expense.date.strftime('%d/%m/%Y'),
        'merchant': expense.merchant,
        'display_name': expense.renamed_merchant if expense.renamed_merchant else expense.merchant,
        'description': expense.description,
        'amount': float(expense.amount),
        'is_debit': expense.is_debit,
        'notes': expense.notes,
        'category_id': expense.category_id,
        'flag_id': expense.flag_id,
        'declaration_status': expense.declaration_status,
        'is_declared': expense.declaration_status in [DeclarationStatus.DECLARED.value, DeclarationStatus.REIMBURSED.value],
        'is_reimbursed': expense.declaration_status == DeclarationStatus.REIMBURSED.value,
        'declaration_reference': expense.declaration_reference,
        'declaration_date': expense.declaration_date.strftime('%d/%m/%Y') if expense.declaration_date else None,
        'reimbursement_date': expense.reimbursement_date.strftime('%d/%m/%Y') if expense.reimbursement_date else None,
        'original_text': expense.original_text,
        # Ajouter les informations de règle
        'rule_id': rule.id if rule else None,
        'has_rule': rule is not None
    }
    
    # Ajouter des données de relations pour l'affichage
    if expense.category:
        expense_data['category'] = {
            'id': expense.category.id,
            'name': expense.category.name,
            'color': expense.category.color
        }
    
    if expense.flag:
        expense_data['flag'] = {
            'id': expense.flag.id,
            'name': expense.flag.name,
            'color': expense.flag.color
        }
        
        # Générer le HTML pour le badge du flag
        from flask import render_template_string
        expense_data['flag_html'] = render_template_string(
            "{% from 'macros/tricount/flag_macros.html' import flag_badge %}{{ flag_badge(flag) }}",
            flag=expense.flag
        )
    
    return jsonify({
        'success': True,
        'expense': expense_data
    })