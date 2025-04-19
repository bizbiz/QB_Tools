# app/utils/__init__.py
"""
Module d'initialisation pour les utilitaires de l'application
"""

# Import standard utilities
import re
import datetime
import json

# Import custom utilities with try/except to handle potential missing modules
try:
    from app.utils.rename_helpers import apply_merchant_rename, apply_rule_rename, reset_merchant_rename
except ImportError:
    # If imports fail, provide stubs to prevent application crashes
    def apply_merchant_rename(*args, **kwargs): pass
    def apply_rule_rename(*args, **kwargs): pass
    def reset_merchant_rename(*args, **kwargs): pass

try:
    from app.utils.error_utils import log_redirection_error, log_exception, handle_request_error
except ImportError:
    # Provide stub functions if the actual module is not yet available
    def log_redirection_error(*args, **kwargs): pass
    def log_exception(*args, **kwargs): pass
    def handle_request_error(*args, **kwargs): return None

try:
    from app.utils.sql_query_utils import apply_sort_to_query, build_reimbursement_query
except ImportError:
    # Provide stub functions if the actual module is not yet available
    def apply_sort_to_query(*args, **kwargs): return args[0]
    def build_reimbursement_query(*args, **kwargs): return None