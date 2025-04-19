# app/routes/tricount/expense_history_routes.py
from flask import jsonify, request
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense, Flag, Category, ModificationSource
from datetime import datetime
import traceback

@tricount_bp.route('/reimbursements/expense-history/<int:expense_id>', methods=['GET'])
def get_expense_history(expense_id):
    """Récupère l'historique des modifications d'une dépense."""
    try:
        expense = Expense.query.get_or_404(expense_id)
        
        # Récupérer les données de l'historique
        history_data = build_expense_history(expense)
        
        return jsonify({
            'success': True,
            'history': history_data
        })
    except Exception as e:
        # Tracer l'erreur
        error_msg = f"Erreur lors de la récupération de l'historique: {str(e)}"
        traceback_str = traceback.format_exc()
        print(error_msg)
        print(traceback_str)
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def build_expense_history(expense):
    """
    Construit l'historique des modifications d'une dépense.
    
    Args:
        expense (Expense): La dépense dont on veut l'historique
    
    Returns:
        list: Liste des événements de l'historique
    """
    history = []
    
    # Événement de création
    creation_event = {
        'type': 'creation',
        'date': expense.created_at.strftime('%Y-%m-%d %H:%M:%S') if expense.created_at else None,
        'title': 'Création de la dépense',
        'details': {
            'source': expense.source or 'Inconnue',
            'merchant': expense.merchant,
            'description': expense.description,
            'amount': float(expense.amount),
            'original_text': expense.original_text
        }
    }
    history.append(creation_event)
    
    # Événements de modification
    if expense.merchant_modified_by and expense.merchant_modified_by != ModificationSource.IMPORT.value:
        merchant_event = {
            'type': 'modification',
            'date': expense.updated_at.strftime('%Y-%m-%d %H:%M:%S') if expense.updated_at else None,
            'title': 'Modification du nom de marchand',
            'details': {
                'field': 'merchant',
                'original': expense.merchant,
                'modified': expense.renamed_merchant,
                'source': expense.merchant_modified_by
            }
        }
        history.append(merchant_event)
    
    if expense.notes_modified_by and expense.notes_modified_by != ModificationSource.IMPORT.value:
        notes_event = {
            'type': 'modification',
            'date': expense.updated_at.strftime('%Y-%m-%d %H:%M:%S') if expense.updated_at else None,
            'title': 'Ajout de notes personnelles',
            'details': {
                'field': 'description',
                'original': expense.description,
                'modified': expense.notes,
                'source': expense.notes_modified_by
            }
        }
        history.append(notes_event)
        
    if expense.category_modified_by and expense.category_modified_by != ModificationSource.IMPORT.value:
        category_name = expense.category.name if expense.category else None
        category_event = {
            'type': 'modification',
            'date': expense.updated_at.strftime('%Y-%m-%d %H:%M:%S') if expense.updated_at else None,
            'title': 'Modification de la catégorie',
            'details': {
                'field': 'category',
                'modified': category_name,
                'source': expense.category_modified_by
            }
        }
        history.append(category_event)
    
    if expense.flag_modified_by and expense.flag_modified_by != ModificationSource.IMPORT.value:
        flag_name = expense.flag.name if expense.flag else None
        flag_event = {
            'type': 'modification',
            'date': expense.updated_at.strftime('%Y-%m-%d %H:%M:%S') if expense.updated_at else None,
            'title': 'Modification du type de dépense',
            'details': {
                'field': 'flag',
                'modified': flag_name,
                'source': expense.flag_modified_by
            }
        }
        history.append(flag_event)
    
    # Événements de déclaration et remboursement
    if expense.declaration_date:
        declaration_event = {
            'type': 'declaration',
            'date': expense.declaration_date.strftime('%Y-%m-%d %H:%M:%S') if expense.declaration_date else None,
            'title': 'Déclaration pour remboursement',
            'details': {
                'reference': expense.declaration_reference,
                'notes': expense.declaration_notes
            }
        }
        history.append(declaration_event)
    
    if expense.reimbursement_date:
        reimbursement_event = {
            'type': 'reimbursement',
            'date': expense.reimbursement_date.strftime('%Y-%m-%d %H:%M:%S') if expense.reimbursement_date else None,
            'title': 'Remboursement effectué',
            'details': {}
        }
        history.append(reimbursement_event)
    
    # Trier par date
    history.sort(key=lambda x: x.get('date') or '', reverse=False)
    
    return history