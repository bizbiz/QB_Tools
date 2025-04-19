# app/routes/admin/__init__.py
from flask import Blueprint

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# Importer les routes après la création du blueprint pour éviter les imports circulaires
from app.routes.admin.errors_routes import errors_admin_bp

# Enregistrer les blueprints enfants
admin_bp.register_blueprint(errors_admin_bp)