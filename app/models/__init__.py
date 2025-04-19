# app/models/__init__.py
"""
Module d'initialisation pour les modèles de l'application
Importe tous les modèles pour qu'ils soient accessibles depuis app.models
"""

# Importer tous les modèles ici pour qu'ils soient disponibles via app.models
from app.models.tricount import (
    Category, Flag, Expense, 
    AutoCategorizationRule, PendingRuleApplication,
    ReimbursementType, ModificationSource, DeclarationStatus
)

# Import ErrorFollowing only if it exists
# This allows the application to start even if the module is not yet created
try:
    from app.models.error_following import ErrorFollowing
except ImportError:
    # Define a placeholder class to avoid errors elsewhere in the code
    class ErrorFollowing:
        """Placeholder for ErrorFollowing model when the actual module is not available."""
        @classmethod
        def log_error(cls, *args, **kwargs):
            """Placeholder method that does nothing."""
            pass