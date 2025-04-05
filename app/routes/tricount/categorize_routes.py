# app/routes/tricount/categorize_routes.py
from flask import render_template
from app.routes.tricount import tricount_bp
from app.models.tricount import Expense, Category

@tricount_bp.route('/categorize')
def categorize_expenses():
    """Page pour catégoriser les dépenses"""
    # Récupérer les dépenses non catégorisées
    uncategorized = Expense.query.filter_by(category_id=None).order_by(Expense.date.desc()).all()
    
    # Récupérer toutes les catégories
    categories = Category.query.all()
    
    return render_template('tricount/categorize.html',
                          expenses=uncategorized,
                          categories=categories)