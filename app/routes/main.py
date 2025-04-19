# app/routes/main.py
from flask import Blueprint, render_template, redirect, url_for
from flask_login import current_user

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def home():
    """Route pour la page d'accueil"""
    # Si l'utilisateur n'est pas connecté, le rediriger vers la page de connexion
    if not current_user.is_authenticated:
        return redirect(url_for('auth.login'))
    
    return render_template('home.html')