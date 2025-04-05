# app/routes/tricount/categorize_routes.py
from flask import render_template
from app.routes.tricount import tricount_bp
from app.models.tricount import Expense, Category, Flag

@tricount_bp.route('/categorize')
def categorize_expenses():
    """Page pour catégoriser les dépenses"""
    # Récupérer les dépenses non catégorisées
    uncategorized = Expense.query.filter_by(category_id=None).order_by(Expense.date.desc()).all()
    
    # Récupérer toutes les catégories et tous les flags
    categories = Category.query.all()
    flags = Flag.query.all()
    
    # Préparation des données pour le JavaScript
    category_data = {}
    for category in categories:
        category_data[category.id] = {
            'name': category.name,
            'flagIds': [flag.id for flag in category.flags]
        }
    
    return render_template('tricount/categorize.html',
                          expenses=uncategorized,
                          categories=categories,
                          flags=flags,
                          category_data=category_data)