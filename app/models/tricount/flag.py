# app/models/tricount/flag.py
"""
Définit le modèle Flag pour les types de dépenses.
"""
from app.extensions import db
from datetime import datetime
from app.models.tricount.common import ReimbursementType

class Flag(db.Model):
    """Modèle pour stocker les flags de dépenses (types de dépenses)"""
    __tablename__ = 'expense_flags'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.String(255))
    color = db.Column(db.String(50))  # Pour le styling (ex: "blue", "#0366d6")
    
    # Identifiant Iconify (remplace l'ancienne relation avec la table Icon)
    iconify_id = db.Column(db.String(100))
    
    # Champ legacy pour compatibilité avec l'ancien système d'icônes
    legacy_icon = db.Column(db.String(50))
    
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Nouveau champ pour le type de remboursement
    reimbursement_type = db.Column(db.String(50), default=ReimbursementType.NOT_REIMBURSABLE.value)
    
    def __repr__(self):
        return f'<Flag {self.name}>'
    
    @property
    def is_reimbursable(self):
        """Vérifie si ce flag correspond à un type de dépense remboursable"""
        # Correction: on vérifie directement sur l'instance du flag elle-même
        if not hasattr(self, 'reimbursement_type'):
            return False
            
        return self.reimbursement_type in [
            ReimbursementType.PARTIALLY_REIMBURSABLE.value,
            ReimbursementType.FULLY_REIMBURSABLE.value
        ]