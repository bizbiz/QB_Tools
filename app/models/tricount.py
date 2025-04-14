# app/models/tricount.py
from app.extensions import db
from datetime import datetime
from sqlalchemy import or_
import hashlib
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

# Mise à jour de la classe Flag dans app/models/tricount.py
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
        """Vérifie si ce flag correspond à des dépenses remboursables"""
        return self.reimbursement_type in [
            ReimbursementType.PARTIALLY_REIMBURSABLE.value,
            ReimbursementType.FULLY_REIMBURSABLE.value
        ]

class Category(db.Model):
    """Modèle pour stocker les catégories de dépenses"""
    __tablename__ = 'expense_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.String(255))
    color = db.Column(db.String(50), default="#e9ecef")  # Couleur de la catégorie
    
    # Identifiant Iconify (remplace l'ancienne relation avec la table Icon)
    iconify_id = db.Column(db.String(100))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Association many-to-many avec les flags
    flags = db.relationship('Flag', secondary='category_flags', backref=db.backref('categories', lazy=True))
    
    # Relation avec les dépenses
    expenses = db.relationship('Expense', backref='category', lazy=True)
    
    def __repr__(self):
        return f'<Category {self.name}>'
    
    @property
    def get_icon_html(self):
        """Génère le HTML pour afficher l'icône de manière appropriée"""
        if self.iconify_id:
            return f'<span class="iconify" data-icon="{self.iconify_id}"></span>'
        elif self.legacy_icon:
            return f'<i class="fas {self.legacy_icon}"></i>'
        else:
            return f'<i class="fas fa-folder"></i>'  # Icône par défaut

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

class AutoCategorizationRule(db.Model):
    """Modèle pour stocker les règles d'auto-catégorisation des dépenses"""
    __tablename__ = 'auto_categorization_rules'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    
    # Filtres
    merchant_contains = db.Column(db.String(200))
    description_contains = db.Column(db.String(200))
    min_amount = db.Column(db.Numeric(10, 2))
    max_amount = db.Column(db.Numeric(10, 2))
    
    # Options
    requires_confirmation = db.Column(db.Boolean, default=True)
    
    # Destination
    category_id = db.Column(db.Integer, db.ForeignKey('expense_categories.id'))
    flag_id = db.Column(db.Integer, db.ForeignKey('expense_flags.id'))
    
    # Options d'action
    apply_category = db.Column(db.Boolean, default=True)
    apply_flag = db.Column(db.Boolean, default=True)
    apply_rename = db.Column(db.Boolean, default=False)
    
    # Configuration de renommage
    rename_pattern = db.Column(db.String(200))
    rename_replacement = db.Column(db.String(200))
    
    # Métadonnées
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_expense_id = db.Column(db.Integer, db.ForeignKey('expenses.id'))
    
    # Relations
    category = db.relationship('Category', backref='auto_rules')
    flag = db.relationship('Flag', backref='auto_rules')
    
    # Relation pour suivre les dépenses affectées par cette règle
    affected_expenses = db.relationship('Expense', 
                                      secondary='rule_expense_links',
                                      backref=db.backref('applied_rules', lazy='dynamic'))
    
    def __repr__(self):
        return f'<AutoCategorizationRule {self.name}>'

    def matches_expense(self, expense):
        """Vérifie si la règle correspond à une dépense"""
        # Vérifier correspondance avec le nom du marchand
        # Rechercher uniquement dans merchant (nom original)
        if self.merchant_contains and self.merchant_contains.lower() not in expense.merchant.lower():
            return False
        
        # Vérifier correspondance avec la description
        if self.description_contains and self.description_contains.lower() not in expense.description.lower():
            return False
        
        # Vérifier le montant minimum
        if self.min_amount is not None and expense.amount < self.min_amount:
            return False
        
        # Vérifier le montant maximum
        if self.max_amount is not None and expense.amount > self.max_amount:
            return False
        
        return True

class PendingRuleApplication(db.Model):
    """Modèle pour stocker les applications de règles en attente de confirmation"""
    __tablename__ = 'pending_rule_applications'
    
    id = db.Column(db.Integer, primary_key=True)
    rule_id = db.Column(db.Integer, db.ForeignKey('auto_categorization_rules.id'), nullable=False)
    expense_id = db.Column(db.Integer, db.ForeignKey('expenses.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    rule = db.relationship('AutoCategorizationRule', backref=db.backref('pending_applications', lazy=True))
    expense = db.relationship('Expense', backref=db.backref('pending_rules', lazy=True))
    
    def __repr__(self):
        return f'<PendingRuleApplication rule={self.rule_id} expense={self.expense_id}>'

# Table de liaison entre règles et dépenses
rule_expense_links = db.Table('rule_expense_links',
    db.Column('rule_id', db.Integer, db.ForeignKey('auto_categorization_rules.id'), primary_key=True),
    db.Column('expense_id', db.Integer, db.ForeignKey('expenses.id'), primary_key=True),
    db.Column('applied_at', db.DateTime, default=datetime.utcnow)
)

# Table d'association entre catégories et flags
category_flags = db.Table('category_flags',
    db.Column('category_id', db.Integer, db.ForeignKey('expense_categories.id'), primary_key=True),
    db.Column('flag_id', db.Integer, db.ForeignKey('expense_flags.id'), primary_key=True)
)