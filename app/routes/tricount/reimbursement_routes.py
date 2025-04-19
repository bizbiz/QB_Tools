# app/routes/tricount/reimbursement_routes.py
"""
Routes pour la gestion des remboursements de dépenses
Ce fichier a été optimisé pour se concentrer uniquement sur la gestion des remboursements
"""
from flask import render_template, redirect, url_for, flash, request, jsonify, Response
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense, Flag, Category, DeclarationStatus
from app.utils.sql_query_utils import build_reimbursement_query, apply_sort_to_query
from app.utils.error_utils import handle_request_error, log_redirection_error
from datetime import datetime
import json
import csv
from io import StringIO

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
        
        # Construire la requête filtrée avec les paramètres de tri
        query = build_reimbursement_query(
            flag_id=params['flag_id'],
            status_values=params['status_values'],
            start_date=params['start_date'],
            end_date=params['end_date'],
            search_query=params['search_query'],
            show_all=params['show_all'],
            sort_by=sort_by,
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
            # Import local pour éviter les cycles d'import
            from app.routes.tricount.expense_details_routes import prepare_expense_response_data
            
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
        return handle_request_error("reimbursements_list", e, is_ajax=is_ajax)

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
        return handle_request_error("get_reimbursement_rows", e, is_ajax=True)

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
        return handle_request_error("get_reimbursement_summary", e, is_ajax=True)

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
        return handle_request_error("export_reimbursements", e, redirect_url=url_for('tricount.index'))