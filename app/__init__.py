# app/__init__.py
from flask import Flask, session
from flask_migrate import Migrate
from flask_login import LoginManager
from app.extensions import db
from app.config import config
from datetime import datetime
import jinja2

# Ajout des fonctions manquantes
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

migrate = Migrate()
def create_app(config_name='default'):
    app = Flask(__name__)
    
    # Configuration globale
    app.config.from_object(config[config_name])
    
    # Configuration spécifique aux sessions - modifié pour QB Tools
    app.config.update(
        SESSION_COOKIE_NAME='qb_tools_session',  # Changé de config_analyzer_session
        SESSION_COOKIE_SECURE=True,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
        PERMANENT_SESSION_LIFETIME=3600  # 1 heure
    )
    # Activer les extensions Jinja2
    app.jinja_env.add_extension('jinja2.ext.loopcontrols')  # Pour break et continue
    
    # Ajouter hasattr comme fonction globale
    app.jinja_env.globals['hasattr'] = hasattr
    
    # Ajouter la fonction attribute (très important pour notre cas)
    app.jinja_env.globals['attribute'] = jinja2_attribute
    app.jinja_env.globals['get_nested_attribute'] = get_nested_attribute
    # Extensions supplémentaires
    app.jinja_env.add_extension('jinja2.ext.do')
    app.jinja_env.add_extension('jinja2.ext.debug')
    
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
    
    # Initialisation des extensions
    db.init_app(app)
    migrate.init_app(app, db)
    @app.template_filter('datetimeformat')
    def datetimeformat(value, format='%d/%m/%Y'):
        """Filtre personnalisé pour formater les dates"""
        if value is None:
            return ""
        return value.strftime(format)
    # Enregistrement des blueprints
    # register_blueprints(app)
    return app

# def register_blueprints(app):
    # from app.routes.clients import clients_bp

    # app.register_blueprint(clients_bp)