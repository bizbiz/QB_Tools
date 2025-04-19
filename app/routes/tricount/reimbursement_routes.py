# app/routes/tricount/reimbursement_routes.py
from flask import render_template, redirect, url_for, flash, request, jsonify, Response
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense, Flag, Category, DeclarationStatus, ReimbursementType, AutoCategorizationRule
from datetime import datetime
from sqlalchemy import or_, case, func
from sqlalchemy.orm import aliased
import json
import traceback
import csv
from io import StringIO


def build_reimbursement_query(flag_id=None, status_values=None, start_date=None, end_date=None, search_query="", show_all=False, sort_by='date', order='desc'):
    """
    Construit une requête pour les dépenses en fonction des critères de filtrage.
    
    Args:
        flag_id (int, optional): ID du flag pour filtrer
        status_values (list, optional): Liste des statuts de déclaration
        start_date (str, optional): Date de début au format YYYY-MM-DD
        end_date (str, optional): Date de fin au format YYYY-MM-DD
        search_query (str, optional): Terme de recherche
        show_all (bool, optional): Afficher toutes les dépenses (True) ou uniquement les remboursables (False)
        sort_by (str, optional): Champ de tri
        order (str, optional): Direction du tri
    
    Returns:
        query: Requête SQLAlchemy filtrée
    """
    # Construire la requête de base
    query = Expense.query
    
    # Validation des entrées
    if order not in ['asc', 'desc']:
        order = 'desc'
    
    if sort_by not in ['date', 'amount', 'merchant', 'description', 'category', 'flag', 'declared', 'reimbursed']:
        sort_by = 'date'
    
    # Appliquer les filtres selon les paramètres
    # Filtre par status multiple
    if status_values:
        query = query.filter(Expense.declaration_status.in_(status_values))
    
    # Filtre par date
    if start_date:
        try:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Expense.date >= start_date_obj)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(Expense.date <= end_date_obj)
        except ValueError:
            pass
    
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
    
    # JOINTURES: les faire avant le filtrage pour éviter les problèmes de référence
    from sqlalchemy import func, case
    from sqlalchemy.orm import aliased
    
    if sort_by == 'category':
        Category_alias = aliased(Category)
        query = query.outerjoin(Category_alias, Expense.category_id == Category_alias.id)
    
    if sort_by == 'flag' or flag_id is not None or not show_all:
        # S'il y a tri par flag, ou un filtrage par flag, ou qu'on montre uniquement les remboursables
        Flag_alias = aliased(Flag)
        query = query.outerjoin(Flag_alias, Expense.flag_id == Flag_alias.id)
        
        # Filtre par flag spécifique
        if flag_id is not None and flag_id > 0:
            query = query.filter(Expense.flag_id == flag_id)
        
        # Filtre pour n'afficher que les dépenses remboursables
        if not show_all:
            # Utiliser Flag_alias si on a fait une jointure avec
            if sort_by == 'flag':
                query = query.filter(
                    Flag_alias.reimbursement_type.in_([
                        ReimbursementType.PARTIALLY_REIMBURSABLE.value,
                        ReimbursementType.FULLY_REIMBURSABLE.value
                    ])
                )
            else:
                # Sinon utiliser le flag normal
                query = query.filter(
                    Flag.reimbursement_type.in_([
                        ReimbursementType.PARTIALLY_REIMBURSABLE.value,
                        ReimbursementType.FULLY_REIMBURSABLE.value
                    ])
                )
    
    # Appliquer le tri
    query = apply_sort_to_query(query, sort_by, order)
    
    return query

def get_filter_params_from_request(is_post=True):
    """
    Extrait et valide les paramètres de filtrage depuis la requête.
    
    Args:
        is_post (bool): True si requête POST, False pour GET
    
    Returns:
        dict: Paramètres de filtrage validés
    """
    source = request.form if is_post else request.args
    
    try:
        # Analyser les statuts (si présents)
        status_values = source.getlist('status')
        
        # Si status_values est vide, prendre tous les statuts par défaut
        if not status_values:
            status_values = [
                DeclarationStatus.NOT_DECLARED.value,
                DeclarationStatus.DECLARED.value, 
                DeclarationStatus.REIMBURSED.value
            ]
        
        # Récupérer et valider les autres paramètres
        flag_id = source.get('flag_id', type=int)
        show_all = source.get('show_all') == '1'
        
        # Extraire les dates en vérifiant qu'elles sont au bon format
        start_date = source.get('start_date')
        end_date = source.get('end_date')
        
        # Vérifier et valider les dates
        if start_date:
            try:
                _ = datetime.strptime(start_date, '%Y-%m-%d')  # Vérifier sans utiliser
            except ValueError:
                start_date = None
        
        if end_date:
            try:
                _ = datetime.strptime(end_date, '%Y-%m-%d')  # Vérifier sans utiliser
            except ValueError:
                end_date = None
        
        # Paramètres de recherche
        search_query = source.get('search', '')
        
        # Paramètres de tri
        sort_by = source.get('sort', 'date')
        order = source.get('order', 'desc')
        
        # Validation du tri
        if sort_by not in ['date', 'merchant', 'amount', 'status', 'description', 'flag', 'category', 'declared', 'reimbursed']:
            sort_by = 'date'
            
        if order not in ['asc', 'desc']:
            order = 'desc'
        
        # Pagination
        page = source.get('page', 1, type=int)
        
        params = {
            'flag_id': flag_id,
            'status_values': status_values,
            'start_date': start_date,
            'end_date': end_date,
            'search_query': search_query,
            'show_all': show_all,
            'sort_by': sort_by,
            'order': order,
            'page': page
        }
        
        return params
        
    except Exception as e:
        # Valeurs par défaut sécurisées
        return {
            'flag_id': None,
            'status_values': [
                DeclarationStatus.NOT_DECLARED.value,
                DeclarationStatus.DECLARED.value, 
                DeclarationStatus.REIMBURSED.value
            ],
            'start_date': None,
            'end_date': None,
            'search_query': '',
            'show_all': False,
            'sort_by': 'date',
            'order': 'desc',
            'page': 1
        }

def apply_sort_to_query(query, sort_by='date', order='desc'):
    """
    Applique le tri à une requête SQLAlchemy.
    
    Args:
        query: Requête SQLAlchemy
        sort_by (str): Champ de tri (date, amount, merchant, category, etc.)
        order (str): Direction du tri (asc/desc)
    
    Returns:
        query: Requête avec tri appliqué
    """
    try:
        # Validation des entrées
        if sort_by not in ['date', 'amount', 'merchant', 'description', 'status', 'flag', 'category', 'declared', 'reimbursed']:
            sort_by = 'date'
        
        if order not in ['asc', 'desc']:
            order = 'desc'
        
        from sqlalchemy import func, case
        from sqlalchemy.orm import aliased
        
        # IMPORTANT: Gestion des jointures selon le mode de tri
        # (les jointures sont maintenant gérées dans build_reimbursement_query)
        
        # Déterminer la colonne à utiliser pour le tri
        if sort_by == 'date':
            column = Expense.date

        elif sort_by == 'amount':
            # Utiliser la propriété hybride si elle existe, sinon créer l'expression
            if hasattr(Expense, 'signed_amount'):
                column = Expense.signed_amount
            else:
                # Créer manuellement l'expression de montant signé
                column = case(
                    (Expense.is_debit == True, -Expense.amount),
                    else_=Expense.amount
                )
        
        elif sort_by in ('merchant', 'description'):
            # Utiliser le nom renommé s'il existe, sinon le nom original
            if sort_by == 'merchant':
                column = func.coalesce(func.lower(Expense.renamed_merchant), func.lower(Expense.merchant))
            else:
                column = func.coalesce(func.lower(Expense.notes), func.lower(Expense.description))
        
        elif sort_by == 'status':
            # Créer une expression numérique pour ordonner par importance des statuts
            # not_declared = 1, declared = 2, reimbursed = 3
            column = case(
                (Expense.declaration_status == DeclarationStatus.NOT_DECLARED.value, 1),
                (Expense.declaration_status == DeclarationStatus.DECLARED.value, 2),
                (Expense.declaration_status == DeclarationStatus.REIMBURSED.value, 3),
                else_=0
            )
        
        elif sort_by == 'declared':
            # Tri spécifique pour la colonne "Déclarée"
            # not_declared = 0, declared/reimbursed = 1
            column = case(
                (Expense.declaration_status == DeclarationStatus.NOT_DECLARED.value, 0),
                else_=1
            )
        
        elif sort_by == 'reimbursed':
            # Tri spécifique pour la colonne "Remboursée"
            # not_reimbursed = 0, reimbursed = 1
            column = case(
                (Expense.declaration_status == DeclarationStatus.REIMBURSED.value, 1),
                else_=0
            )
        
        elif sort_by == 'flag':
            Flag_alias = aliased(Flag)
            query = query.outerjoin(Flag_alias, Expense.flag_id == Flag_alias.id)
            
            # Tri par flag avec NULL à la fin ou au début selon l'ordre
            if order == 'asc':
                column = case(
                    (Flag_alias.name == None, 'zzzzz'),
                    else_=func.lower(Flag_alias.name)
                )
            else:
                column = case(
                    (Flag_alias.name == None, ''),
                    else_=func.lower(Flag_alias.name)
                )
        
        elif sort_by == 'category':
            Category_alias = aliased(Category)
            query = query.outerjoin(Category_alias, Expense.category_id == Category_alias.id)
            
            # Tri par catégorie avec NULL à la fin ou au début selon l'ordre
            if order == 'asc':
                column = case(
                    (Category_alias.name == None, 'zzzzz'),
                    else_=func.lower(Category_alias.name)
                )
            else:
                column = case(
                    (Category_alias.name == None, ''),
                    else_=func.lower(Category_alias.name)
                )
        
        else:
            column = Expense.date
        
        # Appliquer l'ordre de tri
        if order == 'asc':
            query = query.order_by(column.asc())
        else:
            query = query.order_by(column.desc())
            
        return query
        
    except Exception as e:
        # En cas d'erreur, revenir au tri par défaut
        return query.order_by(Expense.date.desc())

# ===== Utilitaires pour les données =====

def calculate_summary(expenses):
    """
    Calcule les statistiques des dépenses remboursables.
    
    Args:
        expenses (list): Liste des dépenses
    
    Returns:
        dict: Statistiques calculées
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

def prepare_category_data(categories, flags):
    """
    Prépare les données des catégories pour JavaScript.
    
    Args:
        categories (list): Liste des catégories
        flags (list): Liste des flags
        
    Returns:
        dict: Données de catégories structurées
    """
    category_data = {}
    
    for category in categories:
        # Récupérer les IDs des flags associés à cette catégorie
        flag_ids = [flag.id for flag in category.flags]
        
        # Préparer les données d'icône
        icon_data = {}
        if hasattr(category, 'iconify_id') and category.iconify_id:
            icon_data['iconify_id'] = category.iconify_id
        elif hasattr(category, 'legacy_icon') and category.legacy_icon:
            icon_data['icon_class'] = category.legacy_icon
        
        # Ajouter les données de cette catégorie
        category_data[category.id] = {
            'id': category.id,
            'name': category.name,
            'color': category.color if hasattr(category, 'color') else '#e9ecef',
            'flagIds': flag_ids,
            **icon_data
        }
    
    return category_data

def prepare_flag_data(flags):
    """
    Prépare les données des flags pour JavaScript.
    
    Args:
        flags (list): Liste des flags
        
    Returns:
        dict: Données de flags structurées
    """
    flag_data = {}
    
    for flag in flags:
        flag_data[flag.id] = {
            'id': flag.id,
            'name': flag.name,
            'color': flag.color,
            'iconify_id': flag.iconify_id if hasattr(flag, 'iconify_id') else None,
            'legacy_icon': flag.legacy_icon if hasattr(flag, 'legacy_icon') else None,
            'reimbursement_type': flag.reimbursement_type if hasattr(flag, 'reimbursement_type') else None
        }
    
    return flag_data

def prepare_expense_response_data(expense):
    """
    Prépare les données d'une dépense pour la réponse JSON.
    
    Args:
        expense (Expense): Objet dépense
        
    Returns:
        dict: Données formatées
    """
    # Générer le HTML pour le badge du flag
    flag_html = None
    if expense.flag:
        from flask import render_template_string
        flag_html = render_template_string(
            "{% from 'macros/tricount/flag_macros.html' import flag_badge %}{{ flag_badge(flag) }}",
            flag=expense.flag
        )
    
    # Données de base
    expense_data = {
        'id': expense.id,
        'date': expense.date.strftime('%d/%m/%Y'),
        'merchant': expense.merchant,
        'renamed_merchant': expense.renamed_merchant,
        'display_name': expense.renamed_merchant if expense.renamed_merchant else expense.merchant,
        'description': expense.description,
        'notes': expense.notes,
        'amount': float(expense.amount),
        'is_debit': expense.is_debit,
        'category_id': expense.category_id,
        'flag_id': expense.flag_id,
        'flag_html': flag_html,
        'declaration_status': expense.declaration_status,
        'is_declared': expense.declaration_status in [DeclarationStatus.DECLARED.value, DeclarationStatus.REIMBURSED.value],
        'is_reimbursed': expense.declaration_status == DeclarationStatus.REIMBURSED.value,
        'declaration_reference': expense.declaration_reference,
        'declaration_date': expense.declaration_date.strftime('%d/%m/%Y') if expense.declaration_date else None,
        'reimbursement_date': expense.reimbursement_date.strftime('%d/%m/%Y') if expense.reimbursement_date else None,
        'original_text': expense.original_text,
        'is_reimbursable': expense.is_reimbursable
    }
    
    # Ajouter les relations
    if expense.category:
        expense_data['category'] = {
            'id': expense.category.id,
            'name': expense.category.name,
            'color': expense.category.color
        }
    
    if expense.flag:
        expense_data['flag'] = {
            'id': expense.flag.id,
            'name': expense.flag.name,
            'color': expense.flag.color
        }
    
    # Vérifier si une règle a été créée à partir de cette dépense
    rule = AutoCategorizationRule.query.filter_by(created_by_expense_id=expense.id).first()
    if rule:
        expense_data['rule_id'] = rule.id
        expense_data['has_rule'] = True
    
    return expense_data

def update_declaration_status(expense, status, update_dates=True):
    """
    Met à jour le statut de déclaration d'une dépense.
    
    Args:
        expense (Expense): Dépense à mettre à jour
        status (str): Nouveau statut
        update_dates (bool): Si True, met à jour les dates de déclaration/remboursement
        
    Returns:
        bool: True si la mise à jour a réussi
    """
    # Validation du statut
    valid_statuses = [status.value for status in DeclarationStatus]
    if status not in valid_statuses:
        return False
    
    # Mise à jour du statut
    expense.declaration_status = status
    
    # Mise à jour des dates si demandé
    if update_dates:
        if status == DeclarationStatus.DECLARED.value and not expense.declaration_date:
            expense.declaration_date = datetime.utcnow()
        elif status == DeclarationStatus.REIMBURSED.value:
            if not expense.reimbursement_date:
                expense.reimbursement_date = datetime.utcnow()
            # Si la dépense est remboursée, elle est forcément déclarée
            if not expense.declaration_date:
                expense.declaration_date = datetime.utcnow()
        elif status == DeclarationStatus.NOT_DECLARED.value:
            expense.declaration_date = None
            expense.reimbursement_date = None
    
    return True

def handle_request_error(e, is_ajax=False):
    """
    Gère les erreurs de requête de manière cohérente.
    
    Args:
        e (Exception): Exception à traiter
        is_ajax (bool): Si True, retourne une réponse JSON, sinon redirige
        
    Returns:
        Response: Réponse HTTP appropriée
    """
    error_msg = f"Erreur: {str(e)}"
    traceback_str = traceback.format_exc()
    print(error_msg)
    print(traceback_str)
    
    if is_ajax:
        return jsonify({
            'success': False,
            'error': str(e),
            'details': "Une erreur s'est produite lors du traitement de la requête."
        }), 500
    
    flash(f"Une erreur s'est produite : {str(e)}", "danger")
    return redirect(url_for('tricount.index'))

@tricount_bp.route('/reimbursements', methods=['POST'])
def reimbursements_list():
    """Page principale de gestion des remboursements."""
    try:
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        
        # Extraire et valider les paramètres de filtrage
        params = get_filter_params_from_request()
        
        # Récupérer explicitement les paramètres de tri
        sort_by = params.get('sort_by', 'date')
        order = params.get('order', 'desc')
        
        print(f"DEBUG - Paramètres de tri: sort_by={sort_by}, order={order}")
        
        # Construire la requête filtrée avec les paramètres de tri
        query = build_reimbursement_query(
            flag_id=params['flag_id'],
            status_values=params['status_values'],
            start_date=params['start_date'],
            end_date=params['end_date'],
            search_query=params['search_query'],
            show_all=params['show_all'],
            sort_by=sort_by,  # Passer explicitement les paramètres de tri
            order=order
        )
        
        # Récupérer les flags et les catégories pour l'interface
        flags = Flag.query.all()
        categories = Category.query.all()
        
        # Calculer les totaux pour le résumé avant pagination
        all_expenses = query.all()
        summary = calculate_summary(all_expenses)
        
        # Pagination
        per_page = 20
        expenses = query.paginate(page=params['page'], per_page=per_page, error_out=False)
        
        # Préparer les données JavaScript
        category_data = prepare_category_data(categories, flags)
        flag_data = prepare_flag_data(flags)
        
        # Si c'est une requête AJAX, renvoyer du JSON
        if is_ajax:
            # Préparer les données pour la réponse JSON
            expenses_data = [prepare_expense_response_data(expense) for expense in expenses.items]
            
            # Données de pagination
            pagination_data = {
                'page': expenses.page,
                'pages': expenses.pages,
                'total': expenses.total,
                'has_prev': expenses.has_prev,
                'has_next': expenses.has_next,
                'prev_num': expenses.prev_num,
                'next_num': expenses.next_num
            }
            
            return jsonify({
                'success': True,
                'expenses': expenses_data,
                'summary': summary,
                'pagination': pagination_data
            })
        
        # Rendu du template normal
        return render_template('tricount/reimbursements.html',
                              expenses=expenses,
                              flags=flags,
                              categories=categories,
                              selected_flag_id=params['flag_id'],
                              selected_status=params['status_values'],
                              start_date=params['start_date'],
                              end_date=params['end_date'],
                              search_query=params['search_query'],
                              sort_by=sort_by,
                              order=order,
                              summary=summary,
                              declaration_statuses=DeclarationStatus,
                              show_all=params['show_all'],
                              category_data_json=json.dumps(category_data),
                              flag_data_json=json.dumps(flag_data))
    except Exception as e:
        return handle_request_error(e, is_ajax)

@tricount_bp.route('/reimbursements', methods=['GET'])
def reimbursements_list_get():
    """Redirection de GET vers POST pour la page des remboursements."""
    # Créer un formulaire avec des valeurs par défaut
    form_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Redirection...</title>
        <script>
            window.onload = function() {
                document.getElementById('redirectForm').submit();
            }
        </script>
    </head>
    <body>
        <form id="redirectForm" method="POST" action="/tricount/reimbursements">
            <!-- Valeurs par défaut pour le filtrage initial -->
            <input type="hidden" name="show_all" value="0">
            <input type="hidden" name="sort" value="date">
            <input type="hidden" name="order" value="desc">
            <input type="hidden" name="status" value="not_declared">
            <input type="hidden" name="status" value="declared">
            <input type="hidden" name="status" value="reimbursed">
        </form>
        <p>Redirection en cours...</p>
    </body>
    </html>
    """
    
    return form_html

@tricount_bp.route('/reimbursements/rows', methods=['POST'])
def get_reimbursement_rows():
    """Génère les lignes du tableau avec les macros Jinja pour AJAX."""
    try:
        # Extraire et valider les paramètres de filtrage
        params = get_filter_params_from_request()
        
        # Construire la requête filtrée avec les paramètres de tri
        query = build_reimbursement_query(
            flag_id=params['flag_id'],
            status_values=params['status_values'],
            start_date=params['start_date'],
            end_date=params['end_date'],
            search_query=params['search_query'],
            show_all=params['show_all'],
            sort_by=params['sort_by'],
            order=params['order']
        )
        
        # Calculer les totaux pour le résumé avant pagination
        all_expenses = query.all()
        summary = calculate_summary(all_expenses)
        
        # Pagination
        per_page = 20
        expenses = query.paginate(page=params['page'], per_page=per_page, error_out=False)
        
        # Génération du HTML pour la réponse
        rows_html = render_template('tricount/partials/reimbursement_rows.html', 
                                  expenses=expenses.items)
        
        # Données de pagination
        pagination_data = {
            'page': expenses.page,
            'pages': expenses.pages,
            'total': expenses.total,
            'has_prev': expenses.has_prev,
            'has_next': expenses.has_next,
            'prev_num': expenses.prev_num,
            'next_num': expenses.next_num
        }
        
        # Renvoyer une réponse plus détaillée
        response_data = {
            'success': True,
            'html': rows_html,
            'summary': summary,
            'pagination': pagination_data
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tricount_bp.route('/reimbursements/update/<int:expense_id>', methods=['POST'])
def update_reimbursement_status(expense_id):
    """Met à jour le statut de remboursement d'une dépense."""
    try:
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
        
        # Mettre à jour le statut
        if not update_declaration_status(expense, status):
            return jsonify({
                'success': False,
                'error': f'Statut invalide: {status}'
            }), 400
        
        # Mettre à jour les autres informations si fournies
        if reference:
            expense.declaration_reference = reference
        if notes:
            expense.declaration_notes = notes
        
        # Sauvegarder les modifications
        db.session.commit()
        
        # Préparer la réponse
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
    """Met à jour le statut de plusieurs dépenses en une seule fois."""
    try:
        # Vérifier si les données sont envoyées en JSON ou en form-data
        if request.is_json:
            data = request.json
            expense_ids = data.get('expense_ids', [])
            status = data.get('status')
        else:
            expense_ids = request.form.getlist('expense_ids[]')
            status = request.form.get('status')
        
        # Validation des entrées
        if not status or not expense_ids:
            return jsonify({
                'success': False,
                'error': 'Paramètres invalides'
            }), 400
            
        # Validation du statut
        valid_statuses = [status.value for status in DeclarationStatus]
        if status not in valid_statuses:
            return jsonify({
                'success': False,
                'error': f'Statut invalide: {status}'
            }), 400
        
        # Mettre à jour toutes les dépenses sélectionnées
        updated_count = 0
        skipped_count = 0
        
        for expense_id in expense_ids:
            expense = Expense.query.get(expense_id)
            if expense and expense.is_reimbursable:
                if update_declaration_status(expense, status):
                    updated_count += 1
                else:
                    skipped_count += 1
            else:
                skipped_count += 1
        
        # Sauvegarder les modifications
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

@tricount_bp.route('/reimbursements/summary', methods=['GET', 'POST'])
def get_reimbursement_summary():
    """Récupère les statistiques des remboursements."""
    try:
        # Extraire les paramètres de filtrage
        params = get_filter_params_from_request(request.method == 'POST')
        
        # Construire la requête
        query = build_reimbursement_query(
            flag_id=params['flag_id'],
            status_values=params['status_values'],
            start_date=params['start_date'],
            end_date=params['end_date'],
            search_query=params['search_query'],
            show_all=params['show_all']
        )
        
        # Récupérer les dépenses et calculer les statistiques
        expenses = query.all()
        summary = calculate_summary(expenses)
        
        return jsonify({
            'success': True,
            'summary': summary
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tricount_bp.route('/reimbursements/expense/<int:expense_id>', methods=['GET'])
def get_expense_details(expense_id):
    """Récupère les détails d'une dépense pour le formulaire d'édition."""
    try:
        expense = Expense.query.get_or_404(expense_id)
        expense_data = prepare_expense_response_data(expense)
        
        return jsonify({
            'success': True,
            'expense': expense_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tricount_bp.route('/reimbursements/export', methods=['GET', 'POST'])
def export_reimbursements():
    """Exporte les données de remboursement au format CSV."""
    try:
        # Extraire les paramètres de filtrage
        params = get_filter_params_from_request(request.method == 'POST')
        
        # Construire la requête filtrée
        query = build_reimbursement_query(
            flag_id=params['flag_id'],
            status_values=params['status_values'],
            start_date=params['start_date'],
            end_date=params['end_date'],
            search_query=params['search_query'],
            show_all=params['show_all']
        )
        
        # Appliquer le tri
        query = apply_sort_to_query(query, params['sort_by'], params['order'])
        
        # Récupérer les dépenses
        expenses = query.all()
        
        # Créer un CSV en mémoire
        output = StringIO()
        writer = csv.writer(output)
        
        # Écrire l'en-tête
        writer.writerow([
            'Date', 'Marchand', 'Description', 'Montant', 'Type', 'Statut', 
            'Date de déclaration', 'Date de remboursement', 'Référence'
        ])
        
        # Écrire les données
        for expense in expenses:
            status_text = {
                DeclarationStatus.NOT_DECLARED.value: 'Non déclarée',
                DeclarationStatus.DECLARED.value: 'Déclarée',
                DeclarationStatus.REIMBURSED.value: 'Remboursée'
            }.get(expense.declaration_status, 'Inconnu')
            
            writer.writerow([
                expense.date.strftime('%d/%m/%Y'),
                expense.renamed_merchant if expense.renamed_merchant else expense.merchant,
                expense.description,
                f"{expense.amount:.2f}",
                expense.flag.name if expense.flag else 'Non défini',
                status_text,
                expense.declaration_date.strftime('%d/%m/%Y') if expense.declaration_date else '',
                expense.reimbursement_date.strftime('%d/%m/%Y') if expense.reimbursement_date else '',
                expense.declaration_reference or ''
            ])
        
        # Renvoyer le CSV
        output.seek(0)
        return Response(
            output,
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=remboursements.csv"}
        )
    except Exception as e:
        return handle_request_error(e, False)