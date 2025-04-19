# app/routes/tricount/auto_rules_routes.py
"""
Fichier de compatibilité pour les importations existantes.
Ce fichier importe les modules séparés auto_rules_management et auto_rules_application
pour maintenir la compatibilité avec les imports existants.

ATTENTION: Ce fichier est une solution temporaire et devrait être supprimé.
Les imports directs vers auto_rules_management et auto_rules_application
devraient être utilisés à la place.
"""
import traceback
from flask import current_app
import sys

# Enregistrer l'utilisation de ce shim dans ErrorFollowing
try:
    from app.models.error_following import ErrorFollowing
    from app.extensions import db
    import inspect
    
    # Obtenir le stack trace pour voir qui appelle ce module
    stack = traceback.extract_stack()
    # Prendre l'avant-dernier élément (celui qui a importé ce module)
    caller = stack[-2] if len(stack) > 1 else None
    
    if caller:
        caller_info = f"{caller.filename}:{caller.lineno} in {caller.name}"
    else:
        caller_info = "unknown caller"
    
    # Créer une entrée d'erreur
    error = ErrorFollowing(
        error_type="deprecated_import",
        source=caller_info,
        message="Utilisation du shim auto_rules_routes.py, qui devrait être remplacé par des imports directs vers auto_rules_management et auto_rules_application",
        stack_trace=traceback.format_stack()
    )
    
    # Essayer d'ajouter l'erreur à la base de données
    try:
        db.session.add(error)
        db.session.commit()
    except Exception as e:
        # Si on ne peut pas enregistrer dans la DB (au démarrage par exemple)
        # Juste afficher un avertissement dans la console
        print(f"WARNING: Using deprecated auto_rules_routes.py shim. Should import from auto_rules_management and auto_rules_application directly. Called from {caller_info}", file=sys.stderr)
except Exception as e:
    # En cas d'erreur avec le logging, ne pas bloquer l'application
    print(f"WARNING: Using deprecated auto_rules_routes.py shim. Error logging: {str(e)}", file=sys.stderr)

# Re-exporter les fonctions des deux nouveaux modules
from app.routes.tricount.auto_rules_management import *
from app.routes.tricount.auto_rules_application import *