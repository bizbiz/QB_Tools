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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Association many-to-many avec les flags
    flags = db.relationship('Flag', secondary='category_flags', backref=db.backref('categories', lazy=True))
    
    # Relation avec les dépenses
    expenses = db.relationship('Expense', backref='category', lazy=True)
    
    def __repr__(self):
        return f'<Category {self.name}>'


# Table d'association entre catégories et flags
category_flags = db.Table('category_flags',
    db.Column('category_id', db.Integer, db.ForeignKey('expense_categories.id'), primary_key=True),
    db.Column('flag_id', db.Integer, db.ForeignKey('expense_flags.id'), primary_key=True)
)

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
    
    # Fréquence
    frequency_type = db.Column(db.String(20))  # monthly, weekly, yearly, etc.
    frequency_day = db.Column(db.Integer)      # jour du mois/semaine
    
    # Destination
    category_id = db.Column(db.Integer, db.ForeignKey('expense_categories.id'))
    flag_id = db.Column(db.Integer, db.ForeignKey('expense_flags.id'))
    
    # Métadonnées
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_expense_id = db.Column(db.Integer, db.ForeignKey('expenses.id'))
    
    # Relations
    category = db.relationship('Category', backref='auto_rules')
    flag = db.relationship('Flag', backref='auto_rules')
    
    def __repr__(self):
        return f'<AutoCategorizationRule {self.name}>'
    
    def matches_expense(self, expense):
        """Vérifie si la règle correspond à une dépense"""
        # Vérifier merchant et description
        if self.merchant_contains and self.merchant_contains.lower() not in expense.merchant.lower():
            return False
        
        if self.description_contains and self.description_contains.lower() not in expense.description.lower():
            return False
        
        # Vérifier la fréquence si définie
        if self.frequency_type and self.frequency_day:
            # Vérifier si la dépense correspond à la fréquence définie
            if self.frequency_type == 'monthly' and expense.date.day != self.frequency_day:
                return False
            elif self.frequency_type == 'weekly' and expense.date.weekday() != self.frequency_day:
                return False
        
        return True