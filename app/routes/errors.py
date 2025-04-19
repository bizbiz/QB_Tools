# app/routes/errors.py
from flask import Blueprint, render_template

errors_bp = Blueprint('errors', __name__)

@errors_bp.app_errorhandler(404)
def page_not_found(error):
    """Gestionnaire d'erreur 404 (page non trouvée)"""
    return render_template('errors/404.html'), 404

@errors_bp.app_errorhandler(403)
def forbidden(error):
    """Gestionnaire d'erreur 403 (accès refusé)"""
    return render_template('errors/403.html'), 403

@errors_bp.app_errorhandler(500)
def internal_server_error(error):
    """Gestionnaire d'erreur 500 (erreur interne du serveur)"""
    return render_template('errors/500.html'), 500