# app/routes/tricount/index_routes.py
from flask import render_template
from app.routes.tricount import tricount_bp
from app.models.tricount import Expense, Flag, PendingRuleApplication, ReimbursementType, DeclarationStatus
from sqlalchemy import and_

@tricount_bp.route('/')
def index():
    """Page principale du module Tricount Helper"""
    # Récupérer les statistiques des dépenses
    expenses_stats = {
        'total': Expense.query.count(),
        'uncategorized': Expense.query.filter_by(category_id=None).count(),
    }
    
    # Ajouter des statistiques par flag
    flags = Flag.query.all()
    for flag in flags:
        expenses_stats[f'flag_{flag.id}'] = Expense.query.filter_by(flag_id=flag.id).count()
    
    # Récupérer les dernières dépenses
    recent_expenses = Expense.query.order_by(Expense.date.desc()).limit(5).all()
    
    # Compter les règles en attente de confirmation
    pending_count = PendingRuleApplication.query.count()
    
    # Compter les dépenses remboursables non déclarées
    try:
        reimbursable_count = Expense.query.join(Flag).filter(
            and_(
                Flag.reimbursement_type.in_([
                    ReimbursementType.PARTIALLY_REIMBURSABLE.value,
                    ReimbursementType.FULLY_REIMBURSABLE.value
                ]),
                Expense.declaration_status == DeclarationStatus.NOT_DECLARED.value
            )
        ).count()
    except Exception as e:
        # En cas d'erreur, on met une valeur par défaut
        print(f"Erreur lors du calcul des dépenses remboursables : {str(e)}")
        reimbursable_count = 0
    
    return render_template('tricount/index.html', 
                           expenses_stats=expenses_stats,
                           flags=flags,
                           recent_expenses=recent_expenses,
                           pending_count=pending_count,
                           reimbursable_count=reimbursable_count)