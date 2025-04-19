# app/routes/tricount/expense_details_routes.py
"""
Routes pour la gestion des détails des dépenses
Ce fichier centralise les fonctionnalités d'accès aux détails des dépenses
"""
from flask import jsonify, request
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense, Category, Flag, ModificationSource, DeclarationStatus, AutoCategorizationRule
from app.utils.error_utils import log_redirection_error, handle_request_error
from datetime import datetime
import traceback

def prepare_expense_response_data(expense):
    """
    Prépare les données d'une dépense pour la réponse JSON.
    
    Args:
        expense (Expense): Objet dépense
        
    Returns:
        dict: Données formatées
    """
    # Générer le HTML pour le badge du flag
    flag_html = None
    if expense.flag:
        from flask import render_template_string
        flag_html = render_template_string(
            "{% from 'macros/tricount/flag_macros.html' import flag_badge %}{{ flag_badge(flag) }}",
            flag=expense.flag
        )
    
    # Données de base
    expense_data = {
        'id': expense.id,
        'date': expense.date.strftime('%d/%m/%Y'),
        'merchant': expense.merchant,
        'renamed_merchant': expense.renamed_merchant,
        'display_name': expense.renamed_merchant if expense.renamed_merchant else expense.merchant,
        'description': expense.description,
        'notes': expense.notes,
        'amount': float(expense.amount),
        'is_debit': expense.is_debit,
        'category_id': expense.category_id,
        'flag_id': expense.flag_id,
        'flag_html': flag_html,
        'declaration_status': expense.declaration_status,
        'is_declared': expense.declaration_status in [DeclarationStatus.DECLARED.value, DeclarationStatus.REIMBURSED.value],
        'is_reimbursed': expense.declaration_status == DeclarationStatus.REIMBURSED.value,
        'declaration_reference': expense.declaration_reference,
        'declaration_date': expense.declaration_date.strftime('%d/%m/%Y') if expense.declaration_date else None,
        'reimbursement_date': expense.reimbursement_date.strftime('%d/%m/%Y') if expense.reimbursement_date else None,
        'original_text': expense.original_text,
        'is_reimbursable': expense.is_reimbursable
    }
    
    # Ajouter les relations
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
    
    # Vérifier si une règle a été créée à partir de cette dépense
    rule = AutoCategorizationRule.query.filter_by(created_by_expense_id=expense.id).first()
    if rule:
        expense_data['rule_id'] = rule.id
        expense_data['has_rule'] = True
    
    return expense_data

@tricount_bp.route('/expense/<int:expense_id>/details', methods=['GET'])
def get_expense_details(expense_id):
    """Récupère les détails d'une dépense pour les formulaires d'édition et de consultation"""
    try:
        expense = Expense.query.get_or_404(expense_id)
        expense_data = prepare_expense_response_data(expense)
        
        return jsonify({
            'success': True,
            'expense': expense_data
        })
    except Exception as e:
        return handle_request_error("get_expense_details", e, is_ajax=True)

@tricount_bp.route('/expense/<int:expense_id>/update', methods=['POST'])
def update_expense_details(expense_id):
    """Met à jour les informations d'une dépense"""
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
        # Comparaison avec None-safe pour éviter les erreurs
        current_renamed = expense.renamed_merchant or ''
        if renamed_merchant != current_renamed:
            expense.renamed_merchant = renamed_merchant or None
            expense.merchant_modified_by = ModificationSource.MANUAL.value
        
        current_notes = expense.notes or ''
        if notes != current_notes:
            expense.notes = notes or None
            expense.notes_modified_by = ModificationSource.MANUAL.value
        
        # Mise à jour de la catégorie si elle a changé
        if category_id and str(expense.category_id) != str(category_id):
            expense.category_id = category_id
            expense.category_modified_by = ModificationSource.MANUAL.value
        
        # Mise à jour du flag si il a changé
        if flag_id and str(expense.flag_id) != str(flag_id):
            expense.flag_id = flag_id
            expense.flag_modified_by = ModificationSource.MANUAL.value
        
        # Mise à jour du statut de déclaration
        if is_declared and not expense.is_declared:
            expense.declaration_status = DeclarationStatus.DECLARED.value
            if not expense.declaration_date:
                expense.declaration_date = datetime.utcnow()
        elif is_reimbursed:
            expense.declaration_status = DeclarationStatus.REIMBURSED.value
            if not expense.declaration_date:
                expense.declaration_date = datetime.utcnow()
            if not expense.reimbursement_date:
                expense.reimbursement_date = datetime.utcnow()
        elif not is_declared and expense.is_declared:
            expense.declaration_status = DeclarationStatus.NOT_DECLARED.value
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
        return handle_request_error("update_expense_details", e, is_ajax=True)

# Routes de redirection pour maintenir la compatibilité
@tricount_bp.route('/reimbursements/expense/<int:expense_id>', methods=['GET'])
def reimbursement_expense_details(expense_id):
    """Redirection vers la nouvelle route pour maintenir la compatibilité"""
    log_redirection_error(
        f"/tricount/reimbursements/expense/{expense_id}",
        f"/tricount/expense/{expense_id}/details",
        "Route de détail de dépense déplacée vers expense_details_routes.py"
    )
    return get_expense_details(expense_id)

@tricount_bp.route('/update_expense', methods=['POST'])
def legacy_update_expense():
    """Redirection vers la nouvelle route pour maintenir la compatibilité"""
    expense_id = request.form.get('expense_id')
    if not expense_id:
        return jsonify({'success': False, 'error': 'ID de dépense manquant'}), 400
    
    log_redirection_error(
        f"/tricount/update_expense",
        f"/tricount/expense/{expense_id}/update",
        "Route de mise à jour de dépense déplacée vers expense_details_routes.py"
    )
    return update_expense_details(expense_id)