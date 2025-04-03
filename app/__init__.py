# app/__init__.py
from flask import Flask, session
from flask_migrate import Migrate
from flask_login import LoginManager
from app.extensions import db
from app.config import config
from datetime import datetime, timedelta

# Importer les utilitaires
from app.utils.jinja_helpers import register_jinja_utilities
from app.utils.date_helpers import register_date_utilities

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
    
    # Enregistrer les utilitaires Jinja et de date
    register_jinja_utilities(app)
    register_date_utilities(app)
    
    # Initialisation des extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Enregistrement des blueprints
    register_blueprints(app)
    return app

def register_blueprints(app):
    from app.routes.main import main_bp
    from app.routes.teamplanning import teamplanning_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(teamplanning_bp)