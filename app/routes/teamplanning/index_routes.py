# app/routes/teamplanning/index_routes.py
from flask import render_template
from app.routes.teamplanning import teamplanning_bp
from flask_login import login_required

@teamplanning_bp.route('/')
@login_required
def index():
    """Page principale du module Teamplanning"""
    return render_template('teamplanning/index.html')