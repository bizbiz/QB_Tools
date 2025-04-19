# app/models/tricount/__init__.py
"""
Point d'entrée pour les modèles du module tricount.
Ce fichier réexporte tous les modèles pour maintenir la compatibilité avec le code existant.
"""

# Importer tous les modèles depuis leurs fichiers individuels
from app.models.tricount.common import ReimbursementType, ModificationSource, DeclarationStatus
from app.models.tricount.flag import Flag
from app.models.tricount.category import Category, category_flags
from app.models.tricount.expense import Expense
from app.models.tricount.rule import AutoCategorizationRule, PendingRuleApplication, rule_expense_links

# Réexporter tous les modèles pour maintenir la compatibilité avec le code existant
__all__ = [
    'ReimbursementType', 'ModificationSource', 'DeclarationStatus',
    'Flag', 'Category', 'Expense', 'AutoCategorizationRule', 
    'PendingRuleApplication', 'category_flags', 'rule_expense_links'
]