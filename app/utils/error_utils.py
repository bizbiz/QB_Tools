# app/utils/error_utils.py
from app.extensions import db
from app.models.error_following import ErrorFollowing
import traceback

def log_redirection_error(original_route, target_route, message=None):
    """
    Enregistre une erreur quand un template essaie d'accéder à une route qui a été redirigée
    
    Args:
        original_route (str): La route originale qui a été accédée
        target_route (str): La route cible vers laquelle elle a été redirigée
        message (str, optional): Message supplémentaire
    """
    if message is None:
        message = f"Attention: Redirection depuis {original_route} vers {target_route}. Mettez à jour les templates pour utiliser la route correcte."
    
    error = ErrorFollowing(
        error_type='redirection',
        source=original_route,
        message=message
    )
    
    db.session.add(error)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Erreur lors de l'enregistrement de la redirection: {str(e)}")

def log_exception(source, exception, message=None):
    """
    Enregistre une exception dans la base de données
    
    Args:
        source (str): Source de l'exception (route, template, etc.)
        exception (Exception): L'exception à enregistrer
        message (str, optional): Message supplémentaire
    """
    if message is None:
        message = f"Exception: {str(exception)}"
    
    error = ErrorFollowing(
        error_type='exception',
        source=source,
        message=message,
        stack_trace=traceback.format_exc()
    )
    
    db.session.add(error)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Erreur lors de l'enregistrement de l'exception: {str(e)}")

def handle_request_error(source, exception, is_ajax=False, redirect_url=None):
    """
    Fonction utilitaire pour gérer les erreurs de requête
    Enregistre l'erreur et renvoie une réponse appropriée
    
    Args:
        source (str): Source de l'erreur
        exception (Exception): L'exception levée
        is_ajax (bool): Si la requête est une requête AJAX
        redirect_url (str): URL de redirection en cas d'erreur (facultatif)
        
    Returns:
        Response: Réponse appropriée selon le type de requête
    """
    from flask import jsonify, redirect, flash, url_for
    
    # Enregistrer l'erreur
    log_exception(source, exception)
    
    # Pour les requêtes AJAX
    if is_ajax:
        return jsonify({
            'success': False,
            'error': str(exception),
            'details': "Une erreur s'est produite lors du traitement de la requête."
        }), 500
    
    # Pour les requêtes normales
    flash(f"Une erreur s'est produite : {str(exception)}", "danger")
    
    # Rediriger vers l'URL spécifiée ou vers la page d'accueil par défaut
    if redirect_url:
        return redirect(redirect_url)
    return redirect(url_for('main.home'))