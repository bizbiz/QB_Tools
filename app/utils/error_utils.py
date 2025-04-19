# app/utils/error_utils.py
"""
Utilitaires pour la gestion des erreurs et leur suivi
Combine l'ancien et le nouveau système pour une meilleure gestion des erreurs
"""
from flask import current_app, redirect, flash, jsonify, request, render_template
import traceback
import json
from datetime import datetime
import sys
from flask_login import current_user

def log_error(error_type, source, message, stack_trace=None, additional_info=None):
    """
    Enregistre une erreur dans la table ErrorFollowing
    
    Args:
        error_type (str): Type d'erreur ('exception', 'redirection', etc.)
        source (str): Source de l'erreur (nom de la fonction, route, etc.)
        message (str): Message d'erreur
        stack_trace (str, optional): Stack trace de l'erreur
        additional_info (dict, optional): Informations supplémentaires
    
    Returns:
        bool: True si l'erreur a été enregistrée, False sinon
    """
    try:
        # Import local pour éviter les imports circulaires
        from app.extensions import db
        from app.models.error_following import ErrorFollowing
        
        # Collecter des informations supplémentaires sur la requête
        all_info = {
            'timestamp': datetime.utcnow().isoformat(),
            'session_id': request.cookies.get('session', 'unknown') if request else 'no_request',
        }
        
        # Ajouter des informations utilisateur si disponible
        try:
            if current_user and current_user.is_authenticated:
                all_info['user'] = {
                    'id': current_user.id,
                    'username': current_user.username,
                    'email': current_user.email
                }
        except:
            all_info['user'] = 'error_accessing_user'
        
        # Ajouter les informations supplémentaires si fournies
        if additional_info:
            all_info.update(additional_info)
        
        # Créer une entrée d'erreur en utilisant la méthode de classe
        error = ErrorFollowing.create_from_exception(
            error_type=error_type,
            source=source,
            message=message,
            stack_trace=stack_trace or json.dumps(all_info, indent=2, default=str),
            additional_info=all_info
        )
        
        # Enregistrer l'erreur
        db.session.add(error)
        db.session.commit()
        
        return True
    except Exception as e:
        # Ne pas provoquer une erreur supplémentaire, juste logger l'échec
        current_app.logger.error(f"Erreur lors de l'enregistrement de l'erreur: {str(e)}")
        try:
            current_app.logger.error(traceback.format_exc())
        except:
            pass
        return False

def log_exception(exception, source=None):
    """
    Enregistre une exception dans la table ErrorFollowing
    
    Args:
        exception (Exception): L'exception à enregistrer
        source (str, optional): Source de l'erreur (nom de la fonction)
    """
    # Récupérer le traceback complet
    exc_type, exc_value, exc_traceback = sys.exc_info()
    stack_trace = ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback))
    
    # Déterminer la source si non fournie
    if not source:
        try:
            frame = traceback.extract_tb(exc_traceback)[-1]
            source = f"{frame.filename}:{frame.lineno}:{frame.name}"
        except:
            source = "Unknown source"
    
    # Collecter des informations contextuelles supplémentaires
    ctx_info = {}
    
    # Informations sur la requête si disponible
    if request:
        ctx_info['request'] = {
            'url': request.url,
            'method': request.method,
            'endpoint': request.endpoint,
            'referrer': request.referrer,
            'user_agent': request.user_agent.string if request.user_agent else None,
            'args': {k: v for k, v in request.args.items()},
        }
        
        # Sécuriser les données POST (ne pas inclure les mots de passe)
        if request.form:
            form_data = {k: v for k, v in request.form.items() if k.lower() not in ('password', 'passwd', 'mdp')}
            ctx_info['request']['form'] = form_data
            
        # Données JSON
        if request.is_json:
            try:
                json_data = request.get_json()
                # Sécuriser les données JSON
                if isinstance(json_data, dict):
                    for key in ['password', 'passwd', 'mdp']:
                        if key in json_data:
                            json_data[key] = '[REDACTED]'
                ctx_info['request']['json'] = json_data
            except:
                ctx_info['request']['json'] = 'error_parsing_json'
    
    # Enregistrer l'erreur
    return log_error(
        error_type="exception",
        source=source,
        message=str(exception),
        stack_trace=stack_trace,
        additional_info=ctx_info
    )

def log_redirection_error(original_route, target_route, reason):
    """
    Enregistre une redirection dans la table ErrorFollowing
    
    Args:
        original_route (str): Route originale
        target_route (str): Nouvelle route
        reason (str): Raison de la redirection
    """
    message = f"Redirection de {original_route} vers {target_route}: {reason}"
    
    # Récupérer le stack trace pour voir d'où vient l'appel
    stack = traceback.format_stack()
    
    # Collecter des informations sur la requête
    request_info = {
        "args": dict(request.args) if request else {},
        "form": dict(request.form) if request and request.form else {},
        "json": request.json if request and request.is_json else {},
        "original_route": original_route,
        "target_route": target_route,
        "reason": reason
    }
    
    return log_error(
        error_type="redirection",
        source=original_route,
        message=message,
        stack_trace="\n".join(stack),
        additional_info=request_info
    )

def handle_request_error(source, exception, redirect_url=None, is_ajax=False):
    """
    Gère une erreur dans une requête HTTP
    
    Args:
        source (str): Source de l'erreur (nom de la fonction)
        exception (Exception): L'exception à gérer
        redirect_url (str, optional): URL de redirection en cas d'erreur
        is_ajax (bool): Indique si c'est une requête AJAX
    
    Returns:
        Response: Redirection ou réponse JSON selon le contexte
    """
    # Enregistrer l'erreur
    log_exception(exception, source)
    
    # Message d'erreur pour l'utilisateur
    error_message = f"Une erreur s'est produite: {str(exception)}"
    
    # Si c'est une requête AJAX, retourner une erreur JSON
    if is_ajax:
        return jsonify({
            'success': False,
            'error': error_message
        }), 500
    
    # Sinon, afficher un message flash et rediriger
    flash(error_message, 'danger')
    if redirect_url:
        return redirect(redirect_url)
    else:
        # Retourner une erreur 500 si pas d'URL de redirection
        return render_template('errors/500.html'), 500

# Fonction utilitaire pour vérifier si une erreur semble être une attaque
def is_potential_attack(error_details):
    """
    Vérifie si l'erreur semble être une tentative d'attaque
    
    Args:
        error_details (dict): Détails de l'erreur
    
    Returns:
        bool: True si cela semble être une attaque
    """
    # Recherche d'indices d'injections SQL
    sql_patterns = [
        "' OR 1=1", "OR 1=1", "UNION SELECT", 
        "DROP TABLE", "DELETE FROM", "INSERT INTO",
        "--", "/*", "*/", "';", ";--"
    ]
    
    # Recherche d'indices de XSS
    xss_patterns = [
        "<script>", "</script>", "javascript:", 
        "onerror=", "onload=", "eval(", 
        "document.cookie", "alert("
    ]
    
    # Vérifier dans les URL et les données POST
    url = error_details.get('url', '')
    request_data = error_details.get('request_data', '')
    
    # Convertir en chaîne pour vérification
    if isinstance(request_data, dict):
        request_data = json.dumps(request_data)
        
    data_to_check = (url + " " + request_data).lower()
    
    # Vérifier les motifs SQL
    for pattern in sql_patterns:
        if pattern.lower() in data_to_check:
            return True
            
    # Vérifier les motifs XSS
    for pattern in xss_patterns:
        if pattern.lower() in data_to_check:
            return True
            
    return False