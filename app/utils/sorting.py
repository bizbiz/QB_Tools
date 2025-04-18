# app/utils/sorting.py
"""
Utilitaires pour le tri et la pagination des données dans les requêtes SQL
"""

from flask import request
from sqlalchemy import asc, desc


def get_sort_params(default_sort='date', default_order='desc'):
    """
    Extrait les paramètres de tri d'une requête HTTP
    
    Args:
        default_sort (str): Champ de tri par défaut
        default_order (str): Ordre de tri par défaut ('asc' ou 'desc')
        
    Returns:
        tuple: (champ de tri, ordre de tri)
    """
    # Récupérer depuis les arguments GET ou POST
    if request.method == 'GET':
        sort_by = request.args.get('sort', default_sort)
        order = request.args.get('order', default_order)
    else:
        sort_by = request.form.get('sort', default_sort)
        order = request.form.get('order', default_order)
    
    # Validation de l'ordre
    if order not in ('asc', 'desc'):
        order = default_order
    
    return sort_by, order


def apply_sort_to_query(query, model, sort_by, order, column_mappings=None):
    """
    Applique les paramètres de tri à une requête SQLAlchemy
    
    Args:
        query: Requête SQLAlchemy
        model: Modèle SQLAlchemy
        sort_by (str): Champ par lequel trier
        order (str): Ordre de tri ('asc' ou 'desc')
        column_mappings (dict): Correspondance entre noms de colonne et attributs du modèle
        
    Returns:
        query: Requête SQLAlchemy avec tri appliqué
    """
    # Mappings par défaut si non fournis
    if column_mappings is None:
        column_mappings = {}
    
    # Déterminer l'attribut de modèle à utiliser pour le tri
    column = None
    
    # Vérifier d'abord dans les mappings personnalisés
    if sort_by in column_mappings:
        column = column_mappings[sort_by]
    # Sinon, essayer de trouver directement dans le modèle
    elif hasattr(model, sort_by):
        column = getattr(model, sort_by)
    
    # Si le champ a été trouvé, appliquer le tri
    if column is not None:
        # Appliquer l'ordre approprié
        if order == 'asc':
            query = query.order_by(asc(column))
        else:
            query = query.order_by(desc(column))
    
    return query


def prepare_sort_for_reimbursements(query, model, sort_by, order):
    """
    Applique un tri spécifique pour les remboursements, gérant les cas particuliers
    
    Args:
        query: Requête SQLAlchemy
        model: Modèle SQLAlchemy (Expense)
        sort_by (str): Champ par lequel trier
        order (str): Ordre de tri ('asc' ou 'desc')
        
    Returns:
        query: Requête SQLAlchemy avec tri appliqué
    """
    # Mappings spécifiques pour les remboursements
    if sort_by == 'date':
        # Tri par date
        column = model.date
    elif sort_by == 'amount':
        # Tri par montant
        column = model.amount
    elif sort_by == 'merchant' or sort_by == 'description':
        # Tri par marchand (préférer le nom renommé s'il existe)
        # SQLAlchemy ne peut pas faire de COALESCE directement, nous utilisons une expression case_when
        from sqlalchemy import case, func
        column = case(
            [(model.renamed_merchant != None, func.lower(model.renamed_merchant))],
            else_=func.lower(model.merchant)
        )
    elif sort_by == 'status':
        # Tri par statut de déclaration
        column = model.declaration_status
    elif sort_by == 'flag' and hasattr(model, 'flag_id'):
        # Tri par flag
        column = model.flag_id
    else:
        # Tri par défaut
        column = model.date
    
    # Appliquer l'ordre de tri
    if order == 'asc':
        query = query.order_by(asc(column))
    else:
        query = query.order_by(desc(column))
    
    return query


def prepare_paginated_response(query, page, per_page, item_processor=None):
    """
    Prépare une réponse JSON avec pagination pour les requêtes AJAX
    
    Args:
        query: Requête SQLAlchemy
        page (int): Numéro de page
        per_page (int): Nombre d'éléments par page
        item_processor (function): Fonction pour traiter chaque élément
        
    Returns:
        dict: Dictionnaire contenant les données paginées et les informations de pagination
    """
    # Paginer la requête
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # Préparer les items
    items = []
    for item in paginated.items:
        # Si un processeur est fourni, l'utiliser
        if item_processor:
            processed_item = item_processor(item)
            items.append(processed_item)
        else:
            # Sinon, convertir l'objet en dictionnaire
            if hasattr(item, '__dict__'):
                items.append(dict(item.__dict__))
            else:
                items.append(item)
    
    # Préparer les infos de pagination
    pagination = {
        'page': paginated.page,
        'pages': paginated.pages,
        'total': paginated.total,
        'has_prev': paginated.has_prev,
        'has_next': paginated.has_next,
        'prev_num': paginated.prev_num,
        'next_num': paginated.next_num
    }
    
    # Retourner toutes les données
    return {
        'items': items,
        'pagination': pagination
    }