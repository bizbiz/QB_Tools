# app/utils/rename_helpers.py
"""Fonctions utilitaires pour le renommage d'objets"""

import re

def apply_merchant_rename(expense, pattern, replacement):
    """
    Applique un modèle de renommage à une dépense sans modifier le nom d'origine
    
    Args:
        expense (Expense): L'objet dépense à renommer
        pattern (str): Motif regex à rechercher
        replacement (str): Texte de remplacement
        
    Returns:
        bool: True si un renommage a été effectué, False sinon
    """
    if not pattern or not expense.merchant:
        return False
    
    # Utiliser le nom renommé s'il existe déjà, sinon utiliser le nom original
    source_name = expense.renamed_merchant if expense.renamed_merchant else expense.merchant
    
    # Appliquer le renommage
    new_name = re.sub(pattern, replacement or '', source_name)
    
    # Vérifier si un changement a été effectué
    if new_name != source_name:
        expense.renamed_merchant = new_name
        return True
    
    return False

def apply_rule_rename(expense, rule):
    """
    Applique le renommage défini dans une règle à une dépense
    
    Args:
        expense (Expense): L'objet dépense à renommer
        rule (AutoCategorizationRule): La règle contenant le pattern et le replacement
        
    Returns:
        bool: True si un renommage a été effectué, False sinon
    """
    if not rule.apply_rename or not rule.rename_pattern:
        return False
    
    return apply_merchant_rename(expense, rule.rename_pattern, rule.rename_replacement)

def reset_merchant_rename(expense):
    """
    Réinitialise le nom renommé d'une dépense
    
    Args:
        expense (Expense): L'objet dépense à réinitialiser
        
    Returns:
        bool: True si une réinitialisation a été effectuée, False sinon
    """
    if expense.renamed_merchant:
        expense.renamed_merchant = None
        return True
    return False