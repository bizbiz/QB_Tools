# app/routes/tricount/__init__.py
from flask import Blueprint, redirect, url_for, flash, request
from flask_login import login_required, current_user

tricount_bp = Blueprint('tricount', __name__, url_prefix='/tricount')

@tricount_bp.before_request
def check_tricount_access():
    """Vérifie l'accès au module Tricount"""
    if not current_user.is_authenticated:
        flash('Veuillez vous connecter pour accéder à cette page.', 'warning')
        return redirect(url_for('auth.login', next=request.url))
    
    # Les admins ont accès à tout
    if current_user.is_admin():
        return None
    
    # Les utilisateurs doivent avoir au moins la permission de lecture
    if not current_user.has_permission('tricount', 'view'):
        flash('Vous n\'avez pas accès au module Tricount.', 'danger')
        return redirect(url_for('main.home'))
    
    # Vérifier les routes d'administration
    admin_routes = ['admin_routes', 'import_routes', 'export_routes', 'category_routes', 'flag_routes', 'auto_rules_routes']
    for route in admin_routes:
        if route in request.endpoint:
            if not current_user.has_permission('tricount', 'admin'):
                flash('Vous n\'avez pas les droits d\'administration du module Tricount.', 'danger')
                return redirect(url_for('tricount.index'))
    
    # Vérifier les routes d'édition
    edit_routes = ['reimbursement_routes', 'pending_rules_routes', 'categorize_routes', 'expense_routes']
    for route in edit_routes:
        if route in request.endpoint and request.method != 'GET':
            if not current_user.has_permission('tricount', 'edit'):
                flash('Vous n\'avez pas les droits d\'édition du module Tricount.', 'danger')
                return redirect(url_for('tricount.index'))
    
    return None

# Import routes after blueprint creation to avoid circular imports
from app.routes.tricount.index_routes import *
from app.routes.tricount.import_routes import *
from app.routes.tricount.expense_routes import *
from app.routes.tricount.categorize_routes import *
from app.routes.tricount.export_routes import *
from app.routes.tricount.category_routes import *
from app.routes.tricount.auto_rules_routes import *  # Utilise le fichier shim qui importe les deux modules
from app.routes.tricount.flag_routes import *
from app.routes.tricount.pending_rules_routes import *
from app.routes.tricount.admin_routes import *
from app.routes.tricount.reimbursement_routes import *
from app.routes.tricount.expense_history_routes import *
from app.routes.tricount.expense_details_routes import *
from app.routes.tricount.expense_status_routes import *
from app.routes.tricount.compatibility_routes import *