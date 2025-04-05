# app/routes/tricount/index_routes.py
from flask import render_template
from app.routes.tricount import tricount_bp
from app.models.tricount import Expense

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
    
    return render_template('tricount/index.html', 
                           expenses_stats=expenses_stats,
                           flags=flags,
                           recent_expenses=recent_expenses)