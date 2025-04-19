# app/models/tricount/category.py
"""
Définit le modèle Category pour les catégories de dépenses.
"""
from app.extensions import db
from datetime import datetime

# Table d'association entre catégories et flags
category_flags = db.Table('category_flags',
    db.Column('category_id', db.Integer, db.ForeignKey('expense_categories.id'), primary_key=True),
    db.Column('flag_id', db.Integer, db.ForeignKey('expense_flags.id'), primary_key=True)
)

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
        elif hasattr(self, 'legacy_icon') and self.legacy_icon:
            return f'<i class="fas {self.legacy_icon}"></i>'
        else:
            return f'<i class="fas fa-folder"></i>'  # Icône par défaut