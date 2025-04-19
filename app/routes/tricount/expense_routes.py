# app/routes/tricount/expense_routes.py
from flask import render_template, jsonify, request
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense, Category, Flag, ModificationSource, DeclarationStatus
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
    
    # Filtre par recherche textuelle
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
    
    # Configuration de pagination
    max_per_page = 50
    page = request.args.get('page', 1, type=int)
    
    # Toujours paginer, que des filtres soient appliqués ou non
    paginated = True
    expenses = query.paginate(page=page, per_page=max_per_page, error_out=False)
    
    # Vérifier si le nombre total de résultats dépasse la limite par page
    exceeds_limit = expenses.total > max_per_page
    
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
                          exceeds_limit=exceeds_limit,
                          max_per_page=max_per_page)

@tricount_bp.route('/update_expense', methods=['POST'])
def update_expense():
    """Met à jour les informations d'une dépense"""
    try:
        expense_id = request.form.get('expense_id')
        expense = Expense.query.get_or_404(expense_id)
        
        # Récupérer les données du formulaire
        renamed_merchant = request.form.get('renamed_merchant', '')
        notes = request.form.get('notes', '')
        category_id = request.form.get('category_id')
        flag_id = request.form.get('flag_id')
        is_declared = request.form.get('is_declared') == 'true'
        is_reimbursed = request.form.get('is_reimbursed') == 'true'
        declaration_reference = request.form.get('declaration_reference', '')
        
        # Mettre à jour uniquement si les valeurs ont changé
        # Comparaison avec None-safe pour éviter les erreurs
        current_renamed = expense.renamed_merchant or ''
        if renamed_merchant != current_renamed:
            expense.renamed_merchant = renamed_merchant or None
            expense.merchant_modified_by = ModificationSource.MANUAL.value
        
        current_notes = expense.notes or ''
        if notes != current_notes:
            expense.notes = notes or None
            expense.notes_modified_by = ModificationSource.MANUAL.value
        
        # Mise à jour de la catégorie si elle a changé
        if category_id and str(expense.category_id) != str(category_id):
            expense.category_id = category_id
            expense.category_modified_by = ModificationSource.MANUAL.value
        
        # Mise à jour du flag si il a changé
        if flag_id and str(expense.flag_id) != str(flag_id):
            expense.flag_id = flag_id
            expense.flag_modified_by = ModificationSource.MANUAL.value
        
        # Mise à jour du statut de déclaration
        if is_declared and not expense.is_declared:
            expense.declaration_status = DeclarationStatus.DECLARED.value
            if not expense.declaration_date:
                expense.declaration_date = datetime.utcnow()
        elif is_reimbursed:
            expense.declaration_status = DeclarationStatus.REIMBURSED.value
            if not expense.declaration_date:
                expense.declaration_date = datetime.utcnow()
            if not expense.reimbursement_date:
                expense.reimbursement_date = datetime.utcnow()
        elif not is_declared and expense.is_declared:
            expense.declaration_status = DeclarationStatus.NOT_DECLARED.value
            expense.declaration_date = None
            expense.reimbursement_date = None
        
        # Mise à jour de la référence
        expense.declaration_reference = declaration_reference
        
        # Sauvegarder les modifications
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Dépense mise à jour avec succès'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500