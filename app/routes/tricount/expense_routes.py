# app/routes/tricount/expense_routes.py
from flask import render_template, jsonify, request
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense, Category
from datetime import datetime

@tricount_bp.route('/expenses')
def expenses_list():
    """Liste des dépenses"""
    # Filtres
    category_id = request.args.get('category_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    include_tricount = request.args.get('tricount', type=int)
    is_professional = request.args.get('professional', type=int)
    
    # Construire la requête
    query = Expense.query
    
    if category_id is not None:
        query = query.filter_by(category_id=category_id)
    elif category_id == 0:  # Cas spécial pour "Non catégorisé"
        query = query.filter_by(category_id=None)
    
    if start_date:
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Expense.date >= start_date)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(Expense.date <= end_date)
        except ValueError:
            pass
    
    if include_tricount is not None:
        query = query.filter_by(include_in_tricount=bool(include_tricount))
    
    if is_professional is not None:
        query = query.filter_by(is_professional=bool(is_professional))
    
    # Tri
    sort_by = request.args.get('sort', 'date')
    order = request.args.get('order', 'desc')
    
    if sort_by == 'date':
        query = query.order_by(Expense.date.desc() if order == 'desc' else Expense.date)
    elif sort_by == 'amount':
        query = query.order_by(Expense.amount.desc() if order == 'desc' else Expense.amount)
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = 20
    expenses = query.paginate(page=page, per_page=per_page)
    
    # Catégories pour le filtre
    categories = Category.query.all()
    
    return render_template('tricount/expenses_list.html',
                          expenses=expenses,
                          categories=categories)

@tricount_bp.route('/expenses/update', methods=['POST'])
def update_expense():
    """API pour mettre à jour une dépense"""
    expense_id = request.form.get('expense_id', type=int)
    category_id = request.form.get('category_id')
    include_tricount = request.form.get('include_tricount') == 'true'
    is_professional = request.form.get('is_professional') == 'true'
    
    if not expense_id:
        return jsonify({'success': False, 'error': 'ID de dépense non fourni'}), 400
    
    expense = Expense.query.get_or_404(expense_id)
    
    # Mettre à jour la catégorie (None si category_id est vide)
    if category_id:
        expense.category_id = int(category_id)
    else:
        expense.category_id = None
    
    expense.include_in_tricount = include_tricount
    expense.is_professional = is_professional
    
    try:
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500