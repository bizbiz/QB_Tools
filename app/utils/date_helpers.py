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

def get_date(year, month, day):
    """
    Crée un objet date à partir de l'année, du mois et du jour
    
    Args:
        year (int): Année
        month (int|str): Mois (numéro ou nom)
        day (int): Jour
        
    Returns:
        datetime: Objet datetime correspondant à la date
    """
    from datetime import datetime
    
    # Si month est une chaîne, convertir en numéro
    if isinstance(month, str):
        month_names_fr = {
            'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6,
            'juillet': 7, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
        }
        month_lower = month.lower()
        
        # Chercher par nom complet
        if month_lower in month_names_fr:
            month_num = month_names_fr[month_lower]
        else:
            # Recherche partielle
            for name, num in month_names_fr.items():
                if name.startswith(month_lower):
                    month_num = num
                    break
            else:
                # Valeur par défaut si non trouvé
                month_num = datetime.now().month
    else:
        month_num = month
    
    return datetime(year, month_num, day)

def register_date_utilities(app):
    """Enregistre toutes les fonctions de date pour Jinja"""
    app.jinja_env.globals['calculate_time_ago'] = calculate_time_ago
    app.jinja_env.globals['get_date'] = get_date
    
    @app.template_filter('datetimeformat')
    def datetimeformat(value, format='%d/%m/%Y'):
        return format_datetime(value, format)