# app/models/tricount.py
from app.extensions import db
from datetime import datetime
import hashlib

class Flag(db.Model):
    """Modèle pour stocker les flags de dépenses (types de dépenses)"""
    __tablename__ = 'expense_flags'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.String(255))
    color = db.Column(db.String(50))  # Pour le styling (ex: "blue", "#0366d6")
    icon = db.Column(db.String(50))   # Pour afficher une icône (ex: "fa-home")
    is_default = db.Column(db.Boolean, default=False)  # Pour définir le flag par défaut
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Flag {self.name}>'

class Category(db.Model):
    """Modèle pour stocker les catégories de dépenses"""
    __tablename__ = 'expense_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.String(255))
    
    # Nouvelle relation avec la table des icônes
    icon_id = db.Column(db.Integer, db.ForeignKey('icons.id'))
    icon = db.relationship('Icon', backref='categories')
    
    # Pour la rétrocompatibilité - sera déprécié après migration
    legacy_icon = db.Column(db.String(50))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Association many-to-many avec les flags
    flags = db.relationship('Flag', secondary='category_flags', backref=db.backref('categories', lazy=True))
    
    # Relation avec les dépenses
    expenses = db.relationship('Expense', backref='category', lazy=True)
    
    def __repr__(self):
        return f'<Category {self.name}>'
    
    @property
    def get_icon_class(self):
        """Récupère la classe Font Awesome de l'icône (compatibilité rétroactive)"""
        if self.icon:
            return self.icon.font_awesome_class
        return self.legacy_icon or 'fa-folder'
    
    @property
    def get_icon_emoji(self):
        """Récupère l'emoji de l'icône"""
        if self.icon:
            return self.icon.unicode_emoji
        return None

class Expense(db.Model):
    """Modèle pour stocker les dépenses importées"""
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    description = db.Column(db.Text, nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    is_debit = db.Column(db.Boolean, default=True)  # True pour dépense, False pour revenu
    
    # Informations supplémentaires extraites
    merchant = db.Column(db.String(200))
    payment_method = db.Column(db.String(100))
    reference = db.Column(db.String(200))
    original_text = db.Column(db.Text)  # Texte original pour référence
    
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
        if self.merchant_contains and self.merchant_contains.lower() not in expense.merchant.lower():
            return False
        
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

class Icon(db.Model):
    """Modèle pour stocker les icônes utilisables dans l'application"""
    __tablename__ = 'icons'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.String(255))
    
    # Représentations de l'icône
    font_awesome_class = db.Column(db.String(50), nullable=False)  # ex: "fa-home"
    unicode_emoji = db.Column(db.String(20))  # ex: "🏠"
    
    # Métadonnées
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Icon {self.name} ({self.font_awesome_class})>'

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