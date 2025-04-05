# app/utils/money_helpers.py
"""Fonctions utilitaires pour la manipulation des montants d'argent"""

import decimal
from decimal import Decimal

def clean_amount_string(amount_str):
    """
    Nettoie une chaîne représentant un montant et la convertit en Decimal
    
    Args:
        amount_str (str): Chaîne représentant un montant (ex: "1 234,56")
        
    Returns:
        Decimal: Montant converti en Decimal
        
    Raises:
        decimal.InvalidOperation: Si la conversion échoue malgré les nettoyages
    """
    # Supprimer les espaces
    cleaned = amount_str.replace(' ', '')
    
    # Remplacer la virgule par un point pour la décimale
    cleaned = cleaned.replace(',', '.')
    
    try:
        return Decimal(cleaned)
    except decimal.InvalidOperation:
        # En cas d'erreur, essayons d'autres nettoyages
        # Supprimer tous les caractères non numériques sauf le point décimal
        clean_str = ''.join(c for c in cleaned if c.isdigit() or c == '.')
        
        # S'assurer qu'il n'y a qu'un seul point décimal
        if clean_str.count('.') > 1:
            last_dot_index = clean_str.rindex('.')
            clean_str = clean_str.replace('.', '', last_dot_index) + clean_str[last_dot_index:]
        
        return Decimal(clean_str)

def format_currency(amount, currency='EUR', locale='fr_FR'):
    """
    Formate un montant selon la devise et la locale spécifiées
    
    Args:
        amount (Decimal|float): Montant à formater
        currency (str): Code de devise (ex: 'EUR', 'USD')
        locale (str): Code de locale (ex: 'fr_FR', 'en_US')
        
    Returns:
        str: Montant formaté selon la locale et la devise
    """
    import locale as loc
    
    # Sauvegarde de la locale actuelle
    old_locale = loc.getlocale(loc.LC_MONETARY)
    
    try:
        # Définir la locale temporairement
        loc.setlocale(loc.LC_MONETARY, locale)
        
        # Formater le montant
        if locale.startswith('fr'):
            # Format français : 1 234,56 €
            return f"{float(amount):,.2f} {currency}".replace(',', ' ').replace('.', ',')
        elif locale.startswith('en'):
            # Format anglais : €1,234.56
            return f"{currency}{float(amount):,.2f}"
        else:
            # Format par défaut
            return f"{float(amount):,.2f} {currency}"
    except:
        # En cas d'erreur, utiliser un format simple
        return f"{float(amount):.2f} {currency}"
    finally:
        # Restaurer la locale d'origine
        try:
            loc.setlocale(loc.LC_MONETARY, old_locale)
        except:
            pass  # Ignorer les erreurs de restauration de la locale