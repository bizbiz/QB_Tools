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
    status = request.args.get('status', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    search_query = request.args.get('search', '')
    
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
    
    # Filtre par flag spécifique
    if flag_id is not None and flag_id > 0:
        query = query.filter(Expense.flag_id == flag_id)
    
    # Filtre par statut de déclaration
    if status != 'all':
        query = query.filter(Expense.declaration_status == status)
    
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
                Expense.notes.ilike(search_term),
                Expense.declaration_reference.ilike(search_term)
            )
        )
    
    # Appliquer le tri
    if sort_by == 'date':
        query = query.order_by(Expense.date.desc() if order == 'desc' else Expense.date)
    elif sort_by == 'amount':
        query = query.order_by(Expense.amount.desc() if order == 'desc' else Expense.amount)
    elif sort_by == 'status':
        query = query.order_by(Expense.declaration_status.desc() if order == 'desc' else Expense.declaration_status)
    else:
        query = query.order_by(Expense.date.desc())  # Tri par défaut
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = 20
    expenses = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # Récupérer les flags remboursables pour le filtrage
    reimbursable_flags = Flag.query.filter(
        Flag.reimbursement_type.in_([
            ReimbursementType.PARTIALLY_REIMBURSABLE.value, 
            ReimbursementType.FULLY_REIMBURSABLE.value
        ])
    ).all()
    
    # Calculer les totaux
    total_amount = 0
    total_declared = 0
    total_reimbursed = 0
    for expense in query.all():
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
    
    summary = {
        'total_amount': total_amount,
        'total_declared': total_declared,
        'total_reimbursed': total_reimbursed,
        'percentage_declared': percentage_declared
    }
    
    return render_template('tricount/reimbursements.html',
                          expenses=expenses,
                          flags=reimbursable_flags,
                          selected_flag_id=flag_id,
                          selected_status=status,
                          start_date=start_date,
                          end_date=end_date,
                          search_query=search_query,
                          sort_by=sort_by,
                          order=order,
                          summary=summary,
                          declaration_statuses=DeclarationStatus)

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
    expense.declaration_reference = reference
    expense.declaration_notes = notes
    
    # Mettre à jour les dates selon le statut
    if status == DeclarationStatus.DECLARED.value and not expense.declaration_date:
        expense.declaration_date = datetime.utcnow()
    elif status == DeclarationStatus.REIMBURSED.value and not expense.reimbursement_date:
        expense.reimbursement_date = datetime.utcnow()
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
    expense_ids = request.json.get('expense_ids', [])
    status = request.json.get('status')
    reference = request.json.get('reference', '')
    
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
                expense.declaration_status = status
                if reference:
                    expense.declaration_reference = reference
                
                # Mettre à jour les dates selon le statut
                if status == DeclarationStatus.DECLARED.value and not expense.declaration_date:
                    expense.declaration_date = datetime.utcnow()
                elif status == DeclarationStatus.REIMBURSED.value and not expense.reimbursement_date:
                    expense.reimbursement_date = datetime.utcnow()
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

@tricount_bp.route('/reimbursements/export', methods=['GET'])
def export_reimbursements():
    """Exporte les données de remboursement au format CSV ou Excel"""
    # TODO: Implémenter cette fonctionnalité
    flash('La fonctionnalité d\'export n\'est pas encore implémentée.', 'info')
    return redirect(url_for('tricount.reimbursements_list'))