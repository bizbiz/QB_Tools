# app/utils/jinja_helpers.py
"""Fonctions utilitaires pour les templates Jinja"""

def jinja2_attribute(obj, attribute):
    """Accède à un attribut de l'objet en toute sécurité."""
    try:
        return getattr(obj, attribute)
    except (AttributeError, TypeError):
        return None

def get_nested_attribute(obj, *args):
    """Accède à des attributs imbriqués en toute sécurité."""
    for attr in args:
        if obj is None:
            return None
        try:
            obj = getattr(obj, attr)
        except (AttributeError, TypeError):
            return None
    return obj

def striptags(value):
    """
    Supprime toutes les balises HTML d'une chaîne
    
    Args:
        value (str): Chaîne contenant potentiellement des balises HTML
        
    Returns:
        str: Chaîne sans balises HTML
    """
    import re
    return re.sub(r'<[^>]*>', '', str(value))

def register_jinja_utilities(app):
    """Enregistre toutes les fonctions utilitaires pour Jinja"""
    # Fonctions de base
    app.jinja_env.globals['hasattr'] = hasattr
    app.jinja_env.globals['attribute'] = jinja2_attribute
    app.jinja_env.globals['get_nested_attribute'] = get_nested_attribute
    
    # Autres fonctions utiles
    app.jinja_env.globals['isinstance'] = isinstance
    app.jinja_env.globals['str'] = str
    app.jinja_env.globals['int'] = int
    app.jinja_env.globals['float'] = float
    app.jinja_env.globals['len'] = len
    app.jinja_env.globals['dict'] = dict
    app.jinja_env.globals['list'] = list
    
    # Filtres utiles
    app.jinja_env.filters['items'] = lambda d: d.items()
    app.jinja_env.filters['keys'] = lambda d: d.keys()
    app.jinja_env.filters['values'] = lambda d: d.values()
    app.jinja_env.filters['striptags'] = striptags
    
    # Activer les extensions Jinja2
    app.jinja_env.add_extension('jinja2.ext.loopcontrols')  # Pour break et continue
    app.jinja_env.add_extension('jinja2.ext.do')
    app.jinja_env.add_extension('jinja2.ext.debug')