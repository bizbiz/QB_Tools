# app/utils/auth_helpers.py
from functools import wraps
from flask import flash, redirect, url_for, abort, request
from flask_login import current_user

def permission_required(tool_name, permission_name):
    """
    Décorateur pour vérifier qu'un utilisateur a une permission spécifique pour un outil
    
    Args:
        tool_name (str): Le nom de l'outil
        permission_name (str): Le nom de la permission requise
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                flash('Veuillez vous connecter pour accéder à cette page.', 'warning')
                return redirect(url_for('auth.login', next=request.url))
            
            if not current_user.has_permission(tool_name, permission_name):
                if current_user.is_admin():
                    # Les admins ont accès à tout
                    return f(*args, **kwargs)
                flash('Vous n\'avez pas la permission nécessaire pour accéder à cette page.', 'danger')
                return abort(403)
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def admin_required(f):
    """Décorateur pour vérifier qu'un utilisateur est administrateur"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Veuillez vous connecter pour accéder à cette page.', 'warning')
            return redirect(url_for('auth.login', next=request.url))
        
        if not current_user.is_admin():
            flash('Vous devez être administrateur pour accéder à cette page.', 'danger')
            return abort(403)
            
        return f(*args, **kwargs)
    return decorated_function