# app/routes/tricount/reimbursement_routes.py
from flask import render_template, redirect, url_for, flash, request, jsonify
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense, Flag, Category, DeclarationStatus, ReimbursementType
from datetime import datetime
from sqlalchemy import or_

@tricount_bp.route('/reimbursements')
def reimbursements_list():
    """Page de gestion des remboursements"""
    # Filtres
    flag_id = request.args.get('flag_id', type=int)
    status_values = request.args.getlist('status')  # Plusieurs statuts possibles
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    search_query = request.args.get('search', '')
    
    # DEBUG: Afficher les paramètres reçus
    print("Paramètres reçus:")
    print(f"flag_id: {flag_id}")
    print(f"status_values: {status_values}")
    print(f"start_date: {start_date}")
    print(f"end_date: {end_date}")
    print(f"search_query: {search_query}")
    
    # Vérifier s'il s'agit d'une requête AJAX
    is_ajax = request.args.get('ajax') == 'true' or request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    # Paramètres de tri
    sort_by = request.args.get('sort', 'date')
    order = request.args.get('order', 'desc')
    
    # Construire la requête de base pour les dépenses remboursables
    query = Expense.query.join(Flag).filter(
        Flag.reimbursement_type.in_([
            ReimbursementType.PARTIALLY_REIMBURSABLE.value,
            ReimbursementType.FULLY_REIMBURSABLE.value
        ])
    )
    
    # DEBUG: Nombre de dépenses avant filtrage
    total_before_filters = query.count()
    print(f"Nombre de dépenses remboursables avant filtrage: {total_before_filters}")
    
    # Filtre par flag spécifique
    if flag_id is not None and flag_id > 0:
        query = query.filter(Expense.flag_id == flag_id)
        # DEBUG: Après filtre de flag
        print(f"Après filtre flag_id={flag_id}, nombre de dépenses: {query.count()}")
    
    # Filtre par statut de déclaration (multiple)
    if status_values:
        # Filtrer pour n'inclure que les dépenses dont le statut est dans la liste
        query = query.filter(Expense.declaration_status.in_(status_values))
        # DEBUG: Après filtre de statut
        print(f"Après filtre statut={status_values}, nombre de dépenses: {query.count()}")
    # Ne pas ajouter de filtre supplémentaire si aucun statut n'est sélectionné
    # Cela permettra d'afficher toutes les dépenses remboursables
    
    # Filtre par date
    if start_date:
        try:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Expense.date >= start_date_obj)
            # DEBUG: Après filtre de date de début
            print(f"Après filtre start_date={start_date}, nombre de dépenses: {query.count()}")
        except ValueError:
            start_date = None
    
    if end_date:
        try:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(Expense.date <= end_date_obj)
            # DEBUG: Après filtre de date de fin
            print(f"Après filtre end_date={end_date}, nombre de dépenses: {query.count()}")
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
                Expense.notes.ilike(search_term),
                Expense.declaration_reference.ilike(search_term)
            )
        )
        # DEBUG: Après filtre de recherche
        print(f"Après filtre search={search_query}, nombre de dépenses: {query.count()}")
    
    # Appliquer le tri
    if sort_by == 'date':
        query = query.order_by(Expense.date.desc() if order == 'desc' else Expense.date)
    elif sort_by == 'amount':
        query = query.order_by(Expense.amount.desc() if order == 'desc' else Expense.amount)
    elif sort_by == 'status':
        query = query.order_by(Expense.declaration_status.desc() if order == 'desc' else Expense.declaration_status)
    else:
        query = query.order_by(Expense.date.desc())  # Tri par défaut
    
    # Calculer les totaux pour le résumé
    summary = calculate_summary(query.all())
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = 20
    expenses = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # DEBUG: Résultat final
    print(f"Pagination: page={page}, par_page={per_page}, total={expenses.total}")
    
    # Si c'est une requête AJAX, renvoyer du JSON
    if is_ajax:
        # Préparer les données des dépenses pour le JSON
        expenses_data = []
        for expense in expenses.items:
            # Générer le HTML pour le badge du flag
            flag_html = None
            if expense.flag:
                from flask import render_template_string
                flag_html = render_template_string(
                    "{% from 'macros/tricount/flag_macros.html' import flag_badge %}{{ flag_badge(flag) }}",
                    flag=expense.flag
                )
            
            # Ajouter les données de la dépense
            expense_data = {
                'id': expense.id,
                'date': expense.date.strftime('%d/%m/%Y'),
                'merchant': expense.renamed_merchant if expense.renamed_merchant else expense.merchant,
                'description': expense.description,
                'amount': float(expense.amount),
                'is_debit': expense.is_debit,
                'flag_id': expense.flag_id,
                'flag_html': flag_html,
                'is_declared': expense.declaration_status in [DeclarationStatus.DECLARED.value, DeclarationStatus.REIMBURSED.value],
                'is_reimbursed': expense.declaration_status == DeclarationStatus.REIMBURSED.value,
                'declaration_status': expense.declaration_status
            }
            expenses_data.append(expense_data)
        
        # Préparer les données de pagination
        pagination_data = {
            'page': expenses.page,
            'pages': expenses.pages,
            'total': expenses.total,
            'has_prev': expenses.has_prev,
            'has_next': expenses.has_next,
            'prev_num': expenses.prev_num,
            'next_num': expenses.next_num
        }
        
        # Retourner les données JSON
        return jsonify({
            'success': True,
            'expenses': expenses_data,
            'summary': summary,
            'pagination': pagination_data
        })
    
    # Récupérer les flags remboursables pour le filtrage
    reimbursable_flags = Flag.query.filter(
        Flag.reimbursement_type.in_([
            ReimbursementType.PARTIALLY_REIMBURSABLE.value, 
            ReimbursementType.FULLY_REIMBURSABLE.value
        ])
    ).all()
    
    # Rendu du template normal
    return render_template('tricount/reimbursements.html',
                          expenses=expenses,
                          flags=reimbursable_flags,
                          selected_flag_id=flag_id,
                          selected_status=status_values[0] if status_values else 'all',
                          start_date=start_date,
                          end_date=end_date,
                          search_query=search_query,
                          sort_by=sort_by,
                          order=order,
                          summary=summary,
                          declaration_statuses=DeclarationStatus)

def calculate_summary(expenses):
    """
    Calcule les statistiques des dépenses remboursables
    
    Args:
        expenses (list): Liste des dépenses remboursables
    
    Returns:
        dict: Dictionnaire contenant les statistiques
    """
    total_amount = 0
    total_declared = 0
    total_reimbursed = 0
    
    for expense in expenses:
        if expense.is_debit:
            total_amount += float(expense.amount)
            if expense.declaration_status == DeclarationStatus.DECLARED.value:
                total_declared += float(expense.amount)
            elif expense.declaration_status == DeclarationStatus.REIMBURSED.value:
                total_reimbursed += float(expense.amount)
    
    # Calculer le pourcentage déclaré
    percentage_declared = 0
    if total_amount > 0:
        percentage_declared = (total_declared + total_reimbursed) / total_amount * 100
    
    return {
        'total_amount': total_amount,
        'total_declared': total_declared,
        'total_reimbursed': total_reimbursed,
        'percentage_declared': percentage_declared
    }

@tricount_bp.route('/reimbursements/update/<int:expense_id>', methods=['POST'])
def update_reimbursement_status(expense_id):
    """API pour mettre à jour le statut de remboursement d'une dépense"""
    expense = Expense.query.get_or_404(expense_id)
    
    # Vérifier que la dépense est remboursable
    if not expense.is_reimbursable:
        return jsonify({
            'success': False,
            'error': 'Cette dépense n\'est pas remboursable'
        }), 400
    
    # Récupérer les données
    status = request.form.get('status')
    reference = request.form.get('reference', '')
    notes = request.form.get('notes', '')
    
    # Validation du statut
    valid_statuses = [status.value for status in DeclarationStatus]
    if status not in valid_statuses:
        return jsonify({
            'success': False,
            'error': f'Statut invalide. Les statuts valides sont: {", ".join(valid_statuses)}'
        }), 400
    
    # Mettre à jour le statut et autres informations
    expense.declaration_status = status
    
    # Ne mettre à jour la référence et les notes que si elles sont fournies
    if reference:
        expense.declaration_reference = reference
    if notes:
        expense.declaration_notes = notes
    
    # Mettre à jour les dates selon le statut
    if status == DeclarationStatus.DECLARED.value and not expense.declaration_date:
        expense.declaration_date = datetime.utcnow()
    elif status == DeclarationStatus.REIMBURSED.value and not expense.reimbursement_date:
        expense.reimbursement_date = datetime.utcnow()
        # Si la dépense est remboursée, elle est forcément déclarée
        if not expense.declaration_date:
            expense.declaration_date = datetime.utcnow()
    elif status == DeclarationStatus.NOT_DECLARED.value:
        expense.declaration_date = None
        expense.reimbursement_date = None
    
    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'expense': {
                'id': expense.id,
                'status': expense.declaration_status,
                'is_declared': expense.declaration_status in [DeclarationStatus.DECLARED.value, DeclarationStatus.REIMBURSED.value],
                'is_reimbursed': expense.declaration_status == DeclarationStatus.REIMBURSED.value,
                'declaration_date': expense.declaration_date.strftime('%d/%m/%Y') if expense.declaration_date else None,
                'reimbursement_date': expense.reimbursement_date.strftime('%d/%m/%Y') if expense.reimbursement_date else None
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tricount_bp.route('/reimbursements/bulk-update', methods=['POST'])
def bulk_update_reimbursement():
    """API pour mettre à jour le statut de plusieurs dépenses en une seule fois"""
    # Vérifier si les données sont envoyées en JSON ou en form-data
    if request.is_json:
        data = request.json
        expense_ids = data.get('expense_ids', [])
        status = data.get('status')
    else:
        expense_ids = request.form.getlist('expense_ids[]')
        status = request.form.get('status')
    
    # Validation du statut
    valid_statuses = [status.value for status in DeclarationStatus]
    if status not in valid_statuses:
        return jsonify({
            'success': False,
            'error': f'Statut invalide. Les statuts valides sont: {", ".join(valid_statuses)}'
        }), 400
    
    if not expense_ids:
        return jsonify({
            'success': False,
            'error': 'Aucune dépense sélectionnée'
        }), 400
    
    # Mettre à jour toutes les dépenses sélectionnées
    try:
        updated_count = 0
        skipped_count = 0
        
        for expense_id in expense_ids:
            expense = Expense.query.get(expense_id)
            if expense and expense.is_reimbursable:
                # Mettre à jour le statut
                expense.declaration_status = status
                
                # Mettre à jour les dates selon le statut
                if status == DeclarationStatus.DECLARED.value and not expense.declaration_date:
                    expense.declaration_date = datetime.utcnow()
                elif status == DeclarationStatus.REIMBURSED.value and not expense.reimbursement_date:
                    expense.reimbursement_date = datetime.utcnow()
                    # Si la dépense est remboursée, elle est forcément déclarée
                    if not expense.declaration_date:
                        expense.declaration_date = datetime.utcnow()
                elif status == DeclarationStatus.NOT_DECLARED.value:
                    expense.declaration_date = None
                    expense.reimbursement_date = None
                
                updated_count += 1
            else:
                skipped_count += 1
        
        db.session.commit()
        return jsonify({
            'success': True,
            'updated': updated_count,
            'skipped': skipped_count
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tricount_bp.route('/reimbursements/summary', methods=['GET'])
def get_reimbursement_summary():
    """API pour récupérer les statistiques des remboursements"""
    # Récupérer les dépenses remboursables
    expenses = Expense.query.join(Flag).filter(
        Flag.reimbursement_type.in_([
            ReimbursementType.PARTIALLY_REIMBURSABLE.value,
            ReimbursementType.FULLY_REIMBURSABLE.value
        ])
    ).all()
    
    # Calculer les statistiques
    summary = calculate_summary(expenses)
    
    return jsonify({
        'success': True,
        'summary': summary
    })

@tricount_bp.route('/reimbursements/export', methods=['GET'])
def export_reimbursements():
    """Exporte les données de remboursement au format CSV ou Excel"""
    # TODO: Implémenter cette fonctionnalité
    flash('La fonctionnalité d\'export n\'est pas encore implémentée.', 'info')
    return redirect(url_for('tricount.reimbursements_list'))