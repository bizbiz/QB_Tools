# app/utils/date_helpers.py
"""Fonctions utilitaires pour la manipulation des dates"""

from datetime import datetime

def calculate_time_ago(timestamp):
    """
    Calcule le temps écoulé depuis timestamp sous forme de texte convivial.
    
    Args:
        timestamp: Objet datetime représentant la date à comparer
        
    Returns:
        str: Texte décrivant le temps écoulé (ex: "Il y a 3 jours")
    """
    now = datetime.utcnow()
    diff = now - timestamp
    
    if diff.days > 0:
        if diff.days == 1:
            return "Il y a 1 jour"
        elif diff.days < 31:
            return f"Il y a {diff.days} jours"
        elif diff.days < 365:
            months = diff.days // 30
            return f"Il y a {months} mois"
        else:
            years = diff.days // 365
            return f"Il y a {years} an{'s' if years > 1 else ''}"
    else:
        hours = diff.seconds // 3600
        if hours > 0:
            return f"Il y a {hours} heure{'s' if hours > 1 else ''}"
        else:
            minutes = diff.seconds // 60
            if minutes > 0:
                return f"Il y a {minutes} minute{'s' if minutes > 1 else ''}"
            else:
                return "Il y a quelques secondes"

def format_datetime(value, format='%d/%m/%Y'):
    """
    Formate une date selon le format spécifié.
    
    Args:
        value: Objet datetime à formater
        format: Format de date souhaité (par défaut: '%d/%m/%Y')
        
    Returns:
        str: Date formatée ou chaîne vide si value est None
    """
    if value is None:
        return ""
    return value.strftime(format)

def register_date_utilities(app):
    """Enregistre toutes les fonctions de date pour Jinja"""
    app.jinja_env.globals['calculate_time_ago'] = calculate_time_ago
    
    @app.template_filter('datetimeformat')
    def datetimeformat(value, format='%d/%m/%Y'):
        return format_datetime(value, format)