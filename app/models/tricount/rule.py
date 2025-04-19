# app/models/tricount/rule.py
"""
Définit les modèles pour les règles d'auto-catégorisation et leur application.
"""
from app.extensions import db
from datetime import datetime
import re
from app.models.tricount.common import ModificationSource

# Table de liaison entre règles et dépenses
rule_expense_links = db.Table('rule_expense_links',
    db.Column('rule_id', db.Integer, db.ForeignKey('auto_categorization_rules.id'), primary_key=True),
    db.Column('expense_id', db.Integer, db.ForeignKey('expenses.id'), primary_key=True),
    db.Column('applied_at', db.DateTime, default=datetime.utcnow)
)

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
    
    # Configuration de renommage du marchand
    apply_rename_merchant = db.Column(db.Boolean, default=False)
    rename_merchant_pattern = db.Column(db.String(200))
    rename_merchant_replacement = db.Column(db.String(200))
    
    # Configuration de modification de description
    apply_rename_description = db.Column(db.Boolean, default=False)
    rename_description_pattern = db.Column(db.String(200))
    rename_description_replacement = db.Column(db.String(200))
    
    # Champs legacy (pour la compatibilité avec l'ancien système)
    apply_rename = db.Column(db.Boolean, default=False)
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
        
    def apply_to_expense(self, expense, source=ModificationSource.AUTO_RULE.value):
        """Applique les actions de la règle à une dépense"""
        changes_made = False
        
        # Appliquer la catégorie si configuré
        if self.apply_category and self.category_id:
            if expense.category_id != self.category_id:
                expense.category_id = self.category_id
                expense.category_modified_by = source
                changes_made = True
        
        # Appliquer le flag si configuré
        if self.apply_flag and self.flag_id:
            if expense.flag_id != self.flag_id:
                expense.flag_id = self.flag_id
                expense.flag_modified_by = source
                changes_made = True
        
        # Appliquer le renommage du marchand si configuré
        if self.apply_rename_merchant and self.rename_merchant_pattern:
            try:
                original_name = expense.renamed_merchant if expense.renamed_merchant else expense.merchant
                pattern = re.compile(self.rename_merchant_pattern)
                new_name = pattern.sub(self.rename_merchant_replacement or '', original_name)
                
                if new_name != original_name:
                    expense.renamed_merchant = new_name
                    expense.merchant_modified_by = source
                    changes_made = True
            except Exception as e:
                print(f"Erreur lors du renommage du marchand: {str(e)}")
        
        # Appliquer la modification de description si configurée
        if self.apply_rename_description and self.rename_description_pattern:
            try:
                original_desc = expense.notes if expense.notes else expense.description
                pattern = re.compile(self.rename_description_pattern)
                new_desc = pattern.sub(self.rename_description_replacement or '', original_desc)
                
                if new_desc != original_desc:
                    expense.notes = new_desc
                    expense.notes_modified_by = source
                    changes_made = True
            except Exception as e:
                print(f"Erreur lors de la modification de description: {str(e)}")
        
        # Support du système legacy de renommage
        if self.apply_rename and self.rename_pattern:
            try:
                original_name = expense.renamed_merchant if expense.renamed_merchant else expense.merchant
                pattern = re.compile(self.rename_pattern)
                new_name = pattern.sub(self.rename_replacement or '', original_name)
                
                if new_name != original_name:
                    expense.renamed_merchant = new_name
                    expense.merchant_modified_by = source
                    changes_made = True
            except Exception as e:
                print(f"Erreur lors du renommage (ancien système): {str(e)}")
        
        return changes_made


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