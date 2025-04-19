# app/routes/auth/__init__.py
from flask import Blueprint

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

# Importer les routes après la création du blueprint pour éviter les imports circulaires
from app.routes.auth.login_routes import *
from app.routes.auth.user_routes import *
from app.routes.auth.group_routes import *