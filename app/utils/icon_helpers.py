# app/utils/icon_helpers.py
"""Fonctions utilitaires pour la gestion des icônes dans l'application"""

def get_icon_by_name(name):
    """
    Récupère une icône par son nom
    
    Args:
        name (str): Nom de l'icône à rechercher
        
    Returns:
        Icon|None: L'icône trouvée ou None
    """
    from app.models.tricount import Icon
    return Icon.query.filter_by(name=name).first()

def get_icon_by_font_awesome_class(fa_class):
    """
    Récupère une icône par sa classe Font Awesome
    
    Args:
        fa_class (str): Classe Font Awesome à rechercher (ex: "fa-home")
        
    Returns:
        Icon|None: L'icône trouvée ou None
    """
    from app.models.tricount import Icon
    return Icon.query.filter_by(font_awesome_class=fa_class).first()

def get_all_icons():
    """
    Récupère toutes les icônes disponibles
    
    Returns:
        list: Liste des icônes
    """
    from app.models.tricount import Icon
    return Icon.query.all()

def register_icon_utilities(app):
    """Enregistre les fonctions liées aux icônes dans Jinja"""
    app.jinja_env.globals['get_icon_by_name'] = get_icon_by_name
    app.jinja_env.globals['get_icon_by_font_awesome_class'] = get_icon_by_font_awesome_class
    app.jinja_env.globals['get_all_icons'] = get_all_icons