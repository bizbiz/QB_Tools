# app/routes/tricount/categorize_routes.py
from flask import render_template, request, jsonify
from app.routes.tricount import tricount_bp
from app.models.tricount import Expense, Category, Flag
from sqlalchemy import or_, desc, asc, case, text
from sqlalchemy.sql.expression import cast
from sqlalchemy.types import Integer

@tricount_bp.route('/categorize')
def categorize_expenses():
    """Page pour catégoriser les dépenses"""
    # Paramètres de tri - changement du tri par défaut
    sort_by = request.args.get('sort_by', 'updated')
    sort_order = request.args.get('sort_order', 'desc')
    
    # Construire la requête de base
    query = Expense.query
    
    # Filtrer pour obtenir les dépenses incomplètes (sans catégorie OU sans flag)
    query = query.filter(
        or_(
            Expense.category_id == None,
            Expense.flag_id == None
        )
    )
    
    # Appliquer le tri en fonction des paramètres
    if sort_by == 'date':
        # Tri par date de la dépense
        if sort_order == 'asc':
            query = query.order_by(asc(Expense.date))
        else:
            query = query.order_by(desc(Expense.date))
    elif sort_by == 'updated':
        # Tri par date de dernière mise à jour
        if sort_order == 'asc':
            query = query.order_by(asc(Expense.updated_at))
        else:
            query = query.order_by(desc(Expense.updated_at))
    elif sort_by == 'amount':
        # Tri par montant
        if sort_order == 'asc':
            query = query.order_by(asc(Expense.amount))
        else:
            query = query.order_by(desc(Expense.amount))
    else:
        # Tri par niveau de complétion - CORRECTION: méthode compatible avec toutes les versions
        # Utiliser directement la somme de l'existence de category_id et flag_id (0, 1 ou 2)
        # En convertissant les expressions booléennes en entiers (0 ou 1)
        completion_score = (
            cast((Expense.category_id != None), Integer) + 
            cast((Expense.flag_id != None), Integer)
        )
        
        if sort_order == 'asc':
            # Les moins complètes en premier (0, puis 1)
            query = query.order_by(
                asc(completion_score),
                desc(Expense.date)  # Secondairement par date décroissante
            )
        else:
            # Les plus complètes en premier (1, puis 0)
            query = query.order_by(
                desc(completion_score),
                desc(Expense.date)  # Secondairement par date décroissante
            )
    
    # Exécuter la requête
    expenses = query.all()
    
    # Récupérer toutes les catégories et tous les flags
    categories = Category.query.all()
    flags = Flag.query.all()
    
    # Préparation des données pour le JavaScript
    category_data = {}
    for category in categories:
        category_data[category.id] = {
            'name': category.name,
            'color': category.color,
            'iconify_id': category.iconify_id,
            'flagIds': [flag.id for flag in category.flags]
        }
    
    return render_template('tricount/categorize.html',
                          expenses=expenses,
                          categories=categories,
                          flags=flags,
                          category_data=category_data,
                          sort_by=sort_by,
                          sort_order=sort_order)

@tricount_bp.route('/categorize/get-expenses')
def get_expenses_for_categorization():
    """API pour obtenir les dépenses à catégoriser avec pagination et tri"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 9, type=int)
    sort_by = request.args.get('sort_by', 'updated')  # Changé pour correspondre au nouveau tri par défaut
    sort_order = request.args.get('sort_order', 'desc')
    
    # Construire la requête
    query = Expense.query.filter(
        or_(
            Expense.category_id == None,
            Expense.flag_id == None
        )
    )
    
    # Appliquer le tri
    if sort_by == 'date':
        order_func = desc if sort_order == 'desc' else asc
        query = query.order_by(order_func(Expense.date))
    elif sort_by == 'updated':
        order_func = desc if sort_order == 'desc' else asc
        query = query.order_by(order_func(Expense.updated_at))
    elif sort_by == 'amount':
        order_func = desc if sort_order == 'desc' else asc
        query = query.order_by(order_func(Expense.amount))
    else:
        # Tri par niveau de complétion - même approche compatible qu'au-dessus
        completion_score = (
            cast((Expense.category_id != None), Integer) + 
            cast((Expense.flag_id != None), Integer)
        )
        
        if sort_order == 'asc':
            query = query.order_by(asc(completion_score), desc(Expense.date))
        else:
            query = query.order_by(desc(completion_score), desc(Expense.date))
    
    # Paginer les résultats
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # Transformer les dépenses en dictionnaire pour JSON
    expenses_data = []
    for expense in paginated.items:
        expense_data = {
            'id': expense.id,
            'date': expense.date.strftime('%d/%m/%Y'),
            'merchant': expense.merchant,
            'renamed_merchant': expense.renamed_merchant,
            'description': expense.description,
            'notes': expense.notes,
            'amount': float(expense.amount),
            'is_debit': expense.is_debit,
            'category_id': expense.category_id,
            'flag_id': expense.flag_id,
            'merchant_modified_by': expense.merchant_modified_by,
            'notes_modified_by': expense.notes_modified_by
        }
        expenses_data.append(expense_data)
    
    return jsonify({
        'success': True,
        'expenses': expenses_data,
        'page': page,
        'per_page': per_page,
        'total': paginated.total,
        'pages': paginated.pages
    })