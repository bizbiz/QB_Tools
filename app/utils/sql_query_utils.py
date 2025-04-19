# app/utils/sql_query_utils.py
"""
Utilitaires pour la construction de requêtes SQL avec SQLAlchemy
Centralise les opérations courantes sur les requêtes, notamment le tri
"""
from sqlalchemy import func, desc, asc, case, cast, Integer, or_
from sqlalchemy.orm import aliased
from app.models.tricount import Expense, Category, Flag, DeclarationStatus

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
        
        # Déterminer la colonne à utiliser pour le tri
        if sort_by == 'date':
            column = Expense.date

        elif sort_by == 'amount':
            # Utiliser la propriété hybride si elle existe, sinon créer l'expression
            if hasattr(Expense, 'signed_amount'):
                column = Expense.signed_amount
            else:
                # Version corrigée de case
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
            # Version corrigée de case
            column = case(
                (Expense.declaration_status == DeclarationStatus.NOT_DECLARED.value, 1),
                (Expense.declaration_status == DeclarationStatus.DECLARED.value, 2),
                (Expense.declaration_status == DeclarationStatus.REIMBURSED.value, 3),
                else_=0
            )
        
        elif sort_by == 'declared':
            # Version corrigée de case
            column = case(
                (Expense.declaration_status == DeclarationStatus.NOT_DECLARED.value, 0),
                else_=1
            )
        
        elif sort_by == 'reimbursed':
            # Version corrigée de case
            column = case(
                (Expense.declaration_status == DeclarationStatus.REIMBURSED.value, 1),
                else_=0
            )
        
        elif sort_by == 'flag':
            Flag_alias = aliased(Flag)
            query = query.outerjoin(Flag_alias, Expense.flag_id == Flag_alias.id)
            
            # Version corrigée de case
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
            
            # Version corrigée de case
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
        print(f"Erreur lors du tri: {str(e)}")
        return query.order_by(Expense.date.desc())

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
            from datetime import datetime
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Expense.date >= start_date_obj)
        except ValueError:
            pass
    
    if end_date:
        try:
            from datetime import datetime
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
                        'partially_reimbursable',
                        'fully_reimbursable'
                    ])
                )
            else:
                # Sinon utiliser le flag normal
                query = query.filter(
                    Flag.reimbursement_type.in_([
                        'partially_reimbursable',
                        'fully_reimbursable'
                    ])
                )
    
    # Appliquer le tri
    query = apply_sort_to_query(query, sort_by, order)
    
    return query