# app/models/tricount/common.py
"""
Définit les énumérations communes utilisées dans le module tricount.
"""
import enum

class ReimbursementType(enum.Enum):
    """
    Énumération des types de remboursement possibles pour les flags.
    """
    NOT_REIMBURSABLE = "not_reimbursable"  # Dépenses personnelles non remboursables
    PARTIALLY_REIMBURSABLE = "partially_reimbursable"  # Dépenses partagées, partiellement remboursables
    FULLY_REIMBURSABLE = "fully_reimbursable"  # Dépenses professionnelles entièrement remboursables
    
    def __str__(self):
        """Convertit l'énumération en chaîne de caractères"""
        return self.value

class ModificationSource(enum.Enum):
    """
    Énumération des différentes sources de modification possibles
    pour les dépenses et autres objets du système.
    """
    MANUAL = "manual"  # Modification manuelle par l'utilisateur
    AUTO_RULE = "auto_rule"  # Modification par une règle automatique sans confirmation
    AUTO_RULE_CONFIRMED = "auto_rule_confirmed"  # Modification par une règle avec confirmation
    IMPORT = "import"  # Valeur importée initialement
    
    def __str__(self):
        """Convertit l'énumération en chaîne de caractères"""
        return self.value

class DeclarationStatus(enum.Enum):
    """
    Énumération des statuts possibles pour une déclaration de remboursement.
    """
    NOT_DECLARED = "not_declared"  # Non déclarée
    DECLARED = "declared"  # Déclarée mais pas encore remboursée
    REIMBURSED = "reimbursed"  # Déclarée et remboursée
    
    def __str__(self):
        """Convertit l'énumération en chaîne de caractères"""
        return self.value