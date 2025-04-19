# app/models/__init__.py
"""
Module d'initialisation pour les modèles de l'application
Importe tous les modèles pour qu'ils soient accessibles depuis app.models
"""

# Importer les modèles utilisateur
from app.models.user import User, Group, Permission

# Importer les modèles tricount
from app.models.tricount import (
    Category, Flag, Expense, 
    AutoCategorizationRule, PendingRuleApplication,
    ReimbursementType, ModificationSource, DeclarationStatus
)

# Importer les modèles de planning
try:
    from app.models.planning import RawPlanning, ParsedPlanning, PlanningEntry
except ImportError:
    # Si l'importation échoue, afficher un avertissement mais continuer
    import sys
    print("AVERTISSEMENT: Impossible d'importer les modèles de planning. Ces tables pourraient être supprimées lors des migrations.", file=sys.stderr)

# Import ErrorFollowing
from app.models.error_following import ErrorFollowing