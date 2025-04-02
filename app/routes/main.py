# app/routes/main.py
from flask import Blueprint, render_template, redirect, url_for

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def home():
    """Route pour la page d'accueil"""
    return render_template('home.html')