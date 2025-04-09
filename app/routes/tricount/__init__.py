# app/routes/tricount/__init__.py
from flask import Blueprint

tricount_bp = Blueprint('tricount', __name__, url_prefix='/tricount')

# Import routes after blueprint creation to avoid circular imports
from app.routes.tricount.index_routes import *
from app.routes.tricount.import_routes import *
from app.routes.tricount.expense_routes import *
from app.routes.tricount.categorize_routes import *
from app.routes.tricount.export_routes import *
from app.routes.tricount.category_routes import *
from app.routes.tricount.auto_rules_routes import *
from app.routes.tricount.flag_routes import *
from app.routes.tricount.pending_rules_routes import *