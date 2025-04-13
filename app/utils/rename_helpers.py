# app/utils/rename_helpers.py
"""Fonctions utilitaires pour le renommage d'objets"""

import re
from app.models.tricount import ModificationSource

def apply_merchant_rename(expense, pattern, replacement, source=ModificationSource.AUTO_RULE.value):
    """
    Applique un modèle de renommage à une dépense sans modifier le nom d'origine
    
    Args:
        expense (Expense): L'objet dépense à renommer
        pattern (str): Motif regex à rechercher
        replacement (str): Texte de remplacement
        source (str): Source de la modification (auto_rule, auto_rule_confirmed, manual)
        
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
        expense.merchant_modified_by = source
        return True
    
    return False

def apply_rule_rename(expense, rule, source=None):
    """
    Applique le renommage défini dans une règle à une dépense
    
    Args:
        expense (Expense): L'objet dépense à renommer
        rule (AutoCategorizationRule): La règle contenant le pattern et le replacement
        source (str, optional): Source de la modification (par défaut: dépend de rule.requires_confirmation)
        
    Returns:
        bool: True si un renommage a été effectué, False sinon
    """
    if not rule.apply_rename or not rule.rename_pattern:
        return False
    
    # Déterminer la source en fonction de si la règle nécessite une confirmation
    if source is None:
        if rule.requires_confirmation:
            source = ModificationSource.AUTO_RULE_CONFIRMED.value
        else:
            source = ModificationSource.AUTO_RULE.value
    
    return apply_merchant_rename(expense, rule.rename_pattern, rule.rename_replacement, source)

def reset_merchant_rename(expense, source=ModificationSource.MANUAL.value):
    """
    Réinitialise le nom renommé d'une dépense
    
    Args:
        expense (Expense): L'objet dépense à réinitialiser
        source (str): Source de la modification (par défaut: manual)
        
    Returns:
        bool: True si une réinitialisation a été effectuée, False sinon
    """
    if expense.renamed_merchant:
        expense.renamed_merchant = None
        expense.merchant_modified_by = source
        return True
    return False