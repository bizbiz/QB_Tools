# app/routes/teamplanning/__init__.py
from flask import Blueprint, redirect, url_for, flash, request
from flask_login import login_required, current_user

teamplanning_bp = Blueprint('teamplanning', __name__, url_prefix='/teamplanning')

@teamplanning_bp.before_request
def check_teamplanning_access():
    """Vérifie l'accès au module Teamplanning"""
    if not current_user.is_authenticated:
        flash('Veuillez vous connecter pour accéder à cette page.', 'warning')
        return redirect(url_for('auth.login', next=request.url))
    
    # Les admins ont accès à tout
    if current_user.is_admin():
        return None
    
    # Les utilisateurs doivent avoir au moins la permission de lecture
    if not current_user.has_permission('teamplanning', 'view'):
        flash('Vous n\'avez pas accès au module Teamplanning.', 'danger')
        return redirect(url_for('main.home'))
    
    # Vérifier l'accès en édition pour les requêtes qui modifient des données
    if request.method != 'GET':
        if not current_user.has_permission('teamplanning', 'edit'):
            flash('Vous n\'avez pas les droits d\'édition pour le module Teamplanning.', 'danger')
            return redirect(url_for('teamplanning.index'))
    
    return None

# Import routes after blueprint creation to avoid circular imports
from app.routes.teamplanning.index_routes import *