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
login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Veuillez vous connecter pour accéder à cette page.'
login_manager.login_message_category = 'warning'

@login_manager.user_loader
def load_user(user_id):
    from app.models.user import User
    return User.query.get(int(user_id))

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
    login_manager.init_app(app)
    
    # Enregistrement des blueprints
    register_blueprints(app)
    register_commands(app)
    
    # Enregistrement des gestionnaires d'erreurs
    register_error_handlers(app)
    
    return app

def register_blueprints(app):
    from app.routes.main import main_bp
    from app.routes.teamplanning import teamplanning_bp
    from app.routes.tricount import tricount_bp
    from app.routes.auth import auth_bp
    from app.routes.errors import errors_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(teamplanning_bp)
    app.register_blueprint(tricount_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(errors_bp)

def register_commands(app):
    # Importer et enregistrer les commandes
    from app.commands import register_commands as register_tricount_commands
    from app.commands.user_commands import register_commands as register_user_commands
    
    register_tricount_commands(app)
    register_user_commands(app)

def register_error_handlers(app):
    from app.routes.errors import page_not_found, forbidden, internal_server_error
    
    app.register_error_handler(404, page_not_found)
    app.register_error_handler(403, forbidden)
    app.register_error_handler(500, internal_server_error)