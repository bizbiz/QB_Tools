# app/routes/errors.py
from flask import Blueprint, render_template, request, session
from app.utils.error_utils import log_error
from flask_login import current_user
import traceback
import json

errors_bp = Blueprint('errors', __name__)

@errors_bp.app_errorhandler(404)
def page_not_found(error):
    """Gestionnaire d'erreur 404 (page non trouvée)"""
    # Collecter des données contextuelles
    ctx_data = {
        "url": request.url,
        "endpoint": request.endpoint,
        "method": request.method,
        "referrer": request.referrer,
        "args": {k: v for k, v in request.args.items()},
        "path": request.path,
        "base_url": request.base_url,
        "user_agent": request.user_agent.string if request.user_agent else None,
    }
    
    # Ajouter des informations utilisateur si connecté
    if current_user and current_user.is_authenticated:
        ctx_data["user"] = {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email
        }
    
    # Enregistrer l'erreur dans la base de données
    log_error(
        error_type="404",
        source=request.path,
        message=f"Page non trouvée: {request.url}",
        additional_info=ctx_data
    )
    return render_template('errors/404.html'), 404

@errors_bp.app_errorhandler(403)
def forbidden(error):
    """Gestionnaire d'erreur 403 (accès refusé)"""
    # Collecter des données contextuelles
    ctx_data = {
        "url": request.url,
        "endpoint": request.endpoint,
        "method": request.method,
        "referrer": request.referrer,
        "args": {k: v for k, v in request.args.items()},
        "path": request.path,
        "user_agent": request.user_agent.string if request.user_agent else None,
        "session_keys": list(session.keys()) if session else [],
    }
    
    # Ajouter des informations utilisateur si connecté
    if current_user and current_user.is_authenticated:
        ctx_data["user"] = {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "groups": [g.name for g in getattr(current_user, 'groups', [])]
        }
    
    # Enregistrer l'erreur dans la base de données
    log_error(
        error_type="403",
        source=request.path,
        message=f"Accès refusé: {request.url}",
        additional_info=ctx_data
    )
    return render_template('errors/403.html'), 403

@errors_bp.app_errorhandler(500)
def internal_server_error(error):
    """Gestionnaire d'erreur 500 (erreur interne du serveur)"""
    # Récupérer le traceback complet
    stack_trace = traceback.format_exc()
    
    # Collecter des données contextuelles
    ctx_data = {
        "url": request.url,
        "endpoint": request.endpoint,
        "method": request.method,
        "referrer": request.referrer,
        "args": {k: v for k, v in request.args.items()},
        "path": request.path,
        "user_agent": request.user_agent.string if request.user_agent else None,
        "status_code": getattr(error, 'code', 500),
        "error_name": error.__class__.__name__,
    }
    
    # Ajouter les données POST si présentes (sauf données sensibles)
    if request.form:
        form_data = {}
        for key, value in request.form.items():
            # Ne pas inclure les mots de passe
            if key.lower() not in ('password', 'passwd', 'pwd', 'mot_de_passe', 'mdp'):
                form_data[key] = value
            else:
                form_data[key] = '[REDACTED]'
        ctx_data["form"] = form_data
    
    # Ajouter les données JSON si présentes
    if request.is_json:
        try:
            json_data = request.get_json(silent=True)
            # Sécuriser les données sensibles
            if isinstance(json_data, dict):
                for key in list(json_data.keys()):
                    if key.lower() in ('password', 'passwd', 'pwd', 'mot_de_passe', 'mdp'):
                        json_data[key] = '[REDACTED]'
            ctx_data["json_data"] = json_data
        except:
            ctx_data["json_data"] = "Error parsing JSON"
    
    # Ajouter des informations utilisateur si connecté
    if current_user and current_user.is_authenticated:
        ctx_data["user"] = {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "groups": [g.name for g in getattr(current_user, 'groups', [])]
        }
    
    # Enregistrer l'erreur dans la base de données
    log_error(
        error_type="500",
        source=request.path,
        message=f"Erreur interne du serveur: {str(error)}",
        stack_trace=stack_trace,
        additional_info=ctx_data
    )
    return render_template('errors/500.html'), 500

@errors_bp.app_errorhandler(Exception)
def handle_exception(error):
    """Gestionnaire général d'exceptions non gérées"""
    # Ne pas intercepter les erreurs HTTP qui sont déjà gérées
    if hasattr(error, 'code') and error.code:
        return None
    
    # Récupérer le traceback complet
    stack_trace = traceback.format_exc()
    
    # Collecter des données contextuelles
    ctx_data = {
        "url": request.url if request else "No request context",
        "exception_type": error.__class__.__name__,
        "exception_args": [str(arg) for arg in getattr(error, 'args', [])],
    }
    
    # Ajouter des informations de requête si disponibles
    if request:
        ctx_data.update({
            "endpoint": request.endpoint,
            "method": request.method,
            "referrer": request.referrer,
            "args": {k: v for k, v in request.args.items()},
            "path": request.path,
            "user_agent": request.user_agent.string if request.user_agent else None,
        })
    
    # Ajouter des informations utilisateur si connecté
    try:
        if current_user and current_user.is_authenticated:
            ctx_data["user"] = {
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email,
                "groups": [g.name for g in getattr(current_user, 'groups', [])]
            }
    except:
        ctx_data["user"] = "Error accessing user"
    
    # Enregistrer l'erreur dans la base de données
    log_error(
        error_type="exception",
        source=request.path if request else "No request path",
        message=f"Exception non gérée: {str(error)}",
        stack_trace=stack_trace,
        additional_info=ctx_data
    )
    
    # Renvoyer une erreur 500
    return render_template('errors/500.html'), 500