# app/routes/tricount/expense_status_routes.py
"""
Routes pour la gestion des statuts des dépenses (déclaration, remboursement, etc.)
Ce fichier centralise les fonctionnalités liées à la mise à jour des statuts des dépenses
"""
from flask import jsonify, request, flash, redirect, url_for
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense, DeclarationStatus
from app.utils.error_utils import log_redirection_error, handle_request_error
from datetime import datetime
import traceback

def update_declaration_status(expense, status, update_dates=True):
    """
    Met à jour le statut de déclaration d'une dépense.
    
    Args:
        expense (Expense): Dépense à mettre à jour
        status (str): Nouveau statut
        update_dates (bool): Si True, met à jour les dates de déclaration/remboursement
        
    Returns:
        bool: True si la mise à jour a réussi
    """
    # Validation du statut
    valid_statuses = [status.value for status in DeclarationStatus]
    if status not in valid_statuses:
        return False
    
    # Mise à jour du statut
    expense.declaration_status = status
    
    # Mise à jour des dates si demandé
    if update_dates:
        if status == DeclarationStatus.DECLARED.value and not expense.declaration_date:
            expense.declaration_date = datetime.utcnow()
        elif status == DeclarationStatus.REIMBURSED.value:
            if not expense.reimbursement_date:
                expense.reimbursement_date = datetime.utcnow()
            # Si la dépense est remboursée, elle est forcément déclarée
            if not expense.declaration_date:
                expense.declaration_date = datetime.utcnow()
        elif status == DeclarationStatus.NOT_DECLARED.value:
            expense.declaration_date = None
            expense.reimbursement_date = None
    
    return True

@tricount_bp.route('/expense/update-status/<int:expense_id>', methods=['POST'])
def update_expense_status(expense_id):
    """
    Met à jour le statut de déclaration/remboursement d'une dépense.
    Centralise la logique de mise à jour des statuts pour éviter la duplication.
    """
    try:
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
        
        # Mettre à jour le statut
        if not update_declaration_status(expense, status):
            return jsonify({
                'success': False,
                'error': f'Statut invalide: {status}'
            }), 400
        
        # Mettre à jour les autres informations si fournies
        if reference:
            expense.declaration_reference = reference
        if notes:
            expense.declaration_notes = notes
        
        # Sauvegarder les modifications
        db.session.commit()
        
        # Préparer la réponse
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
        return handle_request_error("update_expense_status", e, is_ajax=True)

@tricount_bp.route('/expense/bulk-update-status', methods=['POST'])
def bulk_update_expense_status():
    """
    Met à jour le statut de déclaration/remboursement de plusieurs dépenses en une seule fois.
    Centralise la logique de mise à jour en masse pour éviter la duplication.
    """
    try:
        # Vérifier si les données sont envoyées en JSON ou en form-data
        if request.is_json:
            data = request.json
            expense_ids = data.get('expense_ids', [])
            status = data.get('status')
        else:
            expense_ids = request.form.getlist('expense_ids[]')
            status = request.form.get('status')
        
        # Validation des entrées
        if not status or not expense_ids:
            return jsonify({
                'success': False,
                'error': 'Paramètres invalides'
            }), 400
            
        # Validation du statut
        valid_statuses = [status.value for status in DeclarationStatus]
        if status not in valid_statuses:
            return jsonify({
                'success': False,
                'error': f'Statut invalide: {status}'
            }), 400
        
        # Mettre à jour toutes les dépenses sélectionnées
        updated_count = 0
        skipped_count = 0
        
        for expense_id in expense_ids:
            expense = Expense.query.get(expense_id)
            if expense and expense.is_reimbursable:
                if update_declaration_status(expense, status):
                    updated_count += 1
                else:
                    skipped_count += 1
            else:
                skipped_count += 1
        
        # Sauvegarder les modifications
        db.session.commit()
        
        return jsonify({
            'success': True,
            'updated': updated_count,
            'skipped': skipped_count
        })
    except Exception as e:
        db.session.rollback()
        return handle_request_error("bulk_update_expense_status", e, is_ajax=True)

# Routes de redirection pour maintenir la compatibilité avec le code existant
@tricount_bp.route('/reimbursements/update/<int:expense_id>', methods=['POST'])
def update_reimbursement_status(expense_id):
    """Redirection vers la nouvelle route pour maintenir la compatibilité"""
    log_redirection_error(
        f"/tricount/reimbursements/update/{expense_id}",
        f"/tricount/expense/update-status/{expense_id}",
        "Route de mise à jour de statut déplacée vers expense_status_routes.py"
    )
    return update_expense_status(expense_id)

@tricount_bp.route('/reimbursements/bulk-update', methods=['POST'])
def bulk_update_reimbursement(expense_id):
    """Redirection vers la nouvelle route pour maintenir la compatibilité"""
    log_redirection_error(
        f"/tricount/reimbursements/bulk-update",
        f"/tricount/expense/bulk-update-status",
        "Route de mise à jour en masse déplacée vers expense_status_routes.py"
    )
    return bulk_update_expense_status()