# app/routes/tricount/expense_routes.py
from flask import render_template, jsonify, request
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense, Category, Flag
from datetime import datetime
from sqlalchemy import or_

@tricount_bp.route('/expenses')
def expenses_list():
    """Liste des dépenses"""
    # Filtres
    category_id = request.args.get('category_id', type=int)
    flag_id = request.args.get('flag_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    search_query = request.args.get('search', '')
    
    # Vérifier si des filtres sont appliqués
    filters_applied = (category_id is not None or flag_id is not None or 
                      start_date is not None or end_date is not None or
                      search_query != '')
    
    # Paramètres de tri
    sort_by = request.args.get('sort', 'date')
    order = request.args.get('order', 'desc')
    
    # Construire la requête
    query = Expense.query
    
    # Filtre par catégorie
    if category_id is not None:
        if category_id == 0:  # Cas spécial pour "Non catégorisé"
            query = query.filter_by(category_id=None)
        elif category_id > 0:  # Catégorie spécifique
            query = query.filter_by(category_id=category_id)
    
    # Filtre par flag
    if flag_id is not None and flag_id > 0:
        query = query.filter_by(flag_id=flag_id)
    
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
    
    # Filtre par recherche textuelle (nouveau)
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
    
    # Appliquer le tri
    if sort_by == 'date':
        query = query.order_by(Expense.date.desc() if order == 'desc' else Expense.date)
    elif sort_by == 'amount':
        query = query.order_by(Expense.amount.desc() if order == 'desc' else Expense.amount)
    else:
        query = query.order_by(Expense.date.desc())  # Tri par défaut
    
    # Pagination seulement si aucun filtre n'est appliqué
    max_per_page = 1000
    
    if not filters_applied:
        # Pagination standard (20 par page)
        page = request.args.get('page', 1, type=int)
        per_page = 20
        expenses = query.paginate(page=page, per_page=per_page)
        paginated = True
    else:
        # Tous les résultats sur une page (limité à 1000)
        total_count = query.count()
        exceeds_limit = total_count > max_per_page
        
        # Limiter à max_per_page résultats
        expenses = query.limit(max_per_page).all()
        paginated = False
    
    # Catégories et flags pour les filtres
    categories = Category.query.all()
    flags = Flag.query.all()
    
    return render_template('tricount/expenses_list.html',
                          expenses=expenses,
                          categories=categories,
                          flags=flags,
                          selected_category_id=category_id,
                          selected_flag_id=flag_id,
                          start_date=start_date,
                          end_date=end_date,
                          search_query=search_query,
                          sort_by=sort_by,
                          order=order,
                          filters_applied=filters_applied,
                          paginated=paginated,
                          exceeds_limit=exceeds_limit if filters_applied else False,
                          max_per_page=max_per_page)

@tricount_bp.route('/expenses/update', methods=['POST'])
def update_expense():
    """API pour mettre à jour une dépense"""
    expense_id = request.form.get('expense_id', type=int)
    category_id = request.form.get('category_id')
    flag_id = request.form.get('flag_id', type=int)
    notes = request.form.get('notes', '')  # Récupérer les notes utilisateur
    
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
    
    # Mettre à jour les notes utilisateur
    expense.notes = notes
    
    try:
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500