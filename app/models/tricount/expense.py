# app/models/tricount/expense.py
"""
Définit le modèle Expense pour les dépenses importées.
"""
from app.extensions import db
from datetime import datetime
import hashlib
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy import case
from app.models.tricount.common import ModificationSource, DeclarationStatus

class Expense(db.Model):
    """Modèle pour stocker les dépenses importées"""
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    description = db.Column(db.Text, nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    is_debit = db.Column(db.Boolean, default=True)  # True pour dépense, False pour revenu
    notes = db.Column(db.Text, nullable=True)  # Notes explicatives ajoutées par l'utilisateur
    
    # Informations supplémentaires extraites
    merchant = db.Column(db.String(200))  # Nom original du marchand/commerçant
    renamed_merchant = db.Column(db.String(200))  # Nom renommé du marchand (si règle appliquée)
    payment_method = db.Column(db.String(100))
    reference = db.Column(db.String(200))
    original_text = db.Column(db.Text)  # Texte original pour référence
    source = db.Column(db.String(50), nullable=True)  # 'societe_generale', 'n26', etc.
    
    # Sources de modification - suivi de qui a modifié chaque attribut
    category_modified_by = db.Column(db.String(50), default=ModificationSource.IMPORT.value)
    flag_modified_by = db.Column(db.String(50), default=ModificationSource.IMPORT.value)
    merchant_modified_by = db.Column(db.String(50), default=ModificationSource.IMPORT.value)
    notes_modified_by = db.Column(db.String(50), default=ModificationSource.IMPORT.value)
    
    # Nouveaux champs pour le suivi des remboursements
    declaration_status = db.Column(db.String(50), default=DeclarationStatus.NOT_DECLARED.value)
    declaration_reference = db.Column(db.String(255))  # Référence externe (ex: numéro de note de frais)
    declaration_date = db.Column(db.DateTime)  # Date de déclaration
    reimbursement_date = db.Column(db.DateTime)  # Date de remboursement effectif
    declaration_notes = db.Column(db.Text)  # Notes sur la déclaration
    
    # Métadonnées
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    category_id = db.Column(db.Integer, db.ForeignKey('expense_categories.id'))
    flag_id = db.Column(db.Integer, db.ForeignKey('expense_flags.id'))
    
    # Relation avec le flag
    flag = db.relationship('Flag', backref=db.backref('expenses', lazy=True))
    
    # Identifiant unique pour éviter les doublons
    unique_identifier = db.Column(db.String(255), unique=True, index=True)
    
    def __repr__(self):
        return f'<Expense {self.date} {self.description} {self.amount}>'
    
    @staticmethod
    def generate_unique_identifier(date, description, amount):
        """Génère un identifiant unique pour éviter les doublons"""
        # Concaténer les informations clés et hasher
        identifier_str = f"{date.isoformat()}|{description}|{amount}"
        return hashlib.md5(identifier_str.encode()).hexdigest()
    
    @property
    def display_name(self):
        """Retourne le nom à afficher pour cette dépense (renommé ou original)"""
        return self.renamed_merchant if self.renamed_merchant else self.merchant
    
    @property
    def is_reimbursable(self):
        """Vérifie si cette dépense est remboursable (partiellement ou totalement)"""
        if not self.flag:
            return False
        return self.flag.is_reimbursable
    
    @property
    def is_declared(self):
        """Vérifie si cette dépense a été déclarée pour remboursement"""
        return self.declaration_status != DeclarationStatus.NOT_DECLARED.value
    
    @property
    def is_reimbursed(self):
        """Vérifie si cette dépense a été remboursée"""
        return self.declaration_status == DeclarationStatus.REIMBURSED.value

    @hybrid_property
    def signed_amount(self):
        """Retourne le montant signé (négatif pour les débits)"""
        return -self.amount if self.is_debit else self.amount
    
    @signed_amount.expression
    def signed_amount(cls):
        """
        Expression SQL pour le montant signé
        Note: Syntaxe de case() mise à jour pour utiliser des éléments positionnels
        au lieu d'une liste, conformément aux recommandations SQLAlchemy.
        """
        # Utilise les arguments positionnels au lieu d'une liste
        return case((cls.is_debit == True, -cls.amount), else_=cls.amount)