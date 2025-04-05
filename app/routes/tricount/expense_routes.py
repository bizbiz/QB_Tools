# app/routes/tricount/expense_routes.py
from flask import render_template, jsonify, request
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense, Category, Flag
from datetime import datetime

@tricount_bp.route('/expenses')
def expenses_list():
    """Liste des dépenses"""
    # Filtres
    category_id = request.args.get('category_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
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
    
    # Filtrage par flags
    flags = Flag.query.all()
    selected_flags = []
    
    for flag in flags:
        flag_param = request.args.get(f'flag_{flag.id}', type=int)
        if flag_param == 1:
            selected_flags.append(flag.id)
    
    if selected_flags:
        query = query.filter(Expense.flag_id.in_(selected_flags))
    
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
                          categories=categories,
                          flags=flags)

@tricount_bp.route('/expenses/update', methods=['POST'])
def update_expense():
    """API pour mettre à jour une dépense"""
    expense_id = request.form.get('expense_id', type=int)
    category_id = request.form.get('category_id')
    flag_id = request.form.get('flag_id', type=int)
    
    if not expense_id:
        return jsonify({'success': False, 'error': 'ID de dépense non fourni'}), 400
    
    expense = Expense.query.get_or_404(expense_id)
    
    # Mettre à jour la catégorie (None si category_id est vide)
    if category_id:
        expense.category_id = int(category_id)
    else:
        expense.category_id = None
    
    # Mettre à jour le flag
    if flag_id:
        expense.flag_id = flag_id
    else:
        # Si aucun flag n'est fourni, utiliser le flag par défaut
        default_flag = Flag.query.filter_by(is_default=True).first()
        if default_flag:
            expense.flag_id = default_flag.id
    
    try:
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500