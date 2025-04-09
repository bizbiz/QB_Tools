# app/services/tricount/auto_categorization.py
from app.models.tricount import Expense, AutoCategorizationRule
from app.extensions import db
from datetime import datetime
import re

class AutoCategorizationService:
    """Service pour gérer l'auto-catégorisation des dépenses"""

    @staticmethod
    def find_similar_expenses(expense, filters=None):
        """
        Trouve des dépenses similaires à celle fournie, avec filtres optionnels
        
        Args:
            expense (Expense): Dépense de référence
            filters (dict): Filtres supplémentaires (merchant_contains, description_contains, etc.)
            
        Returns:
            list: Liste des dépenses similaires
        """
        filters = filters or {}
        
        # Construire la requête de base
        query = Expense.query.filter(
            Expense.id != expense.id,
            Expense.category_id == None  # Non catégorisées
        )
        
        # Vérifier si on doit chercher dans le texte original
        search_original_text = filters.get('search_original_text', False)
        
        # Appliquer les filtres
        merchant_pattern = filters.get('merchant_contains') or expense.merchant.strip().lower()
        if merchant_pattern:
            # Si chercher dans le texte original est activé, on cherche dans le texte original
            # Pour le cas des règles qui font du renommage et où on édite les règles
            # On utilise alors merchant_contains (le texte de recherche) et non le texte renommé
            if search_original_text:
                query = query.filter(Expense.merchant.ilike(f'%{merchant_pattern}%'))
            else:
                # Comportement standard - recherche normale
                query = query.filter(Expense.merchant.ilike(f'%{merchant_pattern}%'))
        
        description_pattern = filters.get('description_contains')
        if description_pattern:
            query = query.filter(Expense.description.ilike(f'%{description_pattern}%'))
        
        # Filtrer par montant si spécifié
        min_amount = filters.get('min_amount')
        if min_amount is not None:
            query = query.filter(Expense.amount >= min_amount)
            
        max_amount = filters.get('max_amount')
        if max_amount is not None:
            query = query.filter(Expense.amount <= max_amount)
        
        # Exécuter la requête
        return query.all()
    
    @staticmethod
    def suggest_category(expense):
        """
        Suggère une catégorie pour une dépense basée sur son marchand
        
        Args:
            expense (Expense): Dépense à catégoriser
            
        Returns:
            dict: Suggestion de catégorie
        """
        from app.models.tricount import Category
        
        # Mappings des mots-clés vers les catégories
        keyword_mappings = {
            'Alimentation': ['restaurant', 'boulangerie', 'carrefour', 'leclerc', 'lidl', 'auchan'],
            'Transport': ['sncf', 'uber', 'taxi', 'ratp', 'train', 'essence'],
            'Abonnements': ['netflix', 'spotify', 'amazon prime', 'disney', 'canal'],
            'Loisirs': ['cinema', 'theatre', 'concert', 'musee'],
            'Santé': ['pharmacie', 'medecin', 'dentiste']
        }
        
        merchant = expense.merchant.lower()
        
        # Chercher dans les mappings
        for category_name, keywords in keyword_mappings.items():
            for keyword in keywords:
                if keyword in merchant:
                    category = Category.query.filter_by(name=category_name).first()
                    if category:
                        return {
                            'category_id': category.id,
                            'confidence': 0.8
                        }
        
        # Si aucune correspondance, retourner des valeurs par défaut
        return {
            'category_id': None,
            'confidence': 0
        }
    
    @staticmethod
    def apply_rules_to_expense(expense):
        """
        Applique les règles d'auto-catégorisation à une dépense
        
        Args:
            expense (Expense): Dépense à catégoriser
            
        Returns:
            bool: True si une règle a été appliquée, False sinon
        """
        # Ne pas traiter les dépenses déjà catégorisées si nécessaire
        if expense.category_id is not None and not expense.needs_rename:
            return False
        
        # Récupérer toutes les règles
        rules = AutoCategorizationRule.query.all()
        
        for rule in rules:
            if rule.matches_expense(expense):
                # Appliquer les modifications selon les options activées
                if rule.apply_category and rule.category_id:
                    expense.category_id = rule.category_id
                
                if rule.apply_flag and rule.flag_id:
                    expense.flag_id = rule.flag_id
                
                if rule.apply_rename and rule.rename_pattern:
                    # Appliquer le renommage si configuré
                    import re
                    if rule.rename_pattern and expense.merchant:
                        expense.merchant = re.sub(rule.rename_pattern, 
                                                 rule.rename_replacement or '', 
                                                 expense.merchant)
                
                # Enregistrer la relation entre la règle et la dépense
                rule.affected_expenses.append(expense)
                
                return True
        
        return False
    
    @staticmethod
    def find_expense_conflicts(expense_id, rule_filters):
        """
        Trouve les dépenses qui correspondent aux filtres mais sont déjà affectées par d'autres règles
        
        Args:
            expense_id: ID de la dépense de référence
            rule_filters: Filtres de la règle en cours de création
            
        Returns:
            dict: Dépenses en conflit organisées par règle
        """
        # Créer une règle temporaire pour les tests
        temp_rule = AutoCategorizationRule(
            name="Règle temporaire",
            merchant_contains=rule_filters.get('merchant_contains', ''),
            description_contains=rule_filters.get('description_contains', ''),
            min_amount=rule_filters.get('min_amount'),
            max_amount=rule_filters.get('max_amount'),
            frequency_type=rule_filters.get('frequency_type'),
            frequency_day=rule_filters.get('frequency_day')
        )
        
        # Trouver toutes les dépenses qui correspondent à ces filtres
        matching_expenses = []
        expenses = Expense.query.filter(Expense.id != expense_id).all()
        
        for expense in expenses:
            if temp_rule.matches_expense(expense):
                matching_expenses.append(expense)
        
        # Vérifier quelles règles existantes affectent déjà ces dépenses
        conflicts = {}
        
        for expense in matching_expenses:
            for rule in expense.applied_rules.all():
                # Ne pas compter les règles qui font exactement la même chose
                if (rule.category_id == rule_filters.get('category_id') and 
                    rule.flag_id == rule_filters.get('flag_id') and 
                    rule.rename_pattern == rule_filters.get('rename_pattern')):
                    continue
                
                # Ajouter au dictionnaire des conflits
                if rule.id not in conflicts:
                    conflicts[rule.id] = {
                        'rule': rule,
                        'expenses': []
                    }
                conflicts[rule.id]['expenses'].append(expense)
        
        return list(conflicts.values())
    
    @staticmethod
    def process_new_expenses():
        """
        Traite les nouvelles dépenses non catégorisées en appliquant les règles
        
        Returns:
            int: Nombre de dépenses catégorisées
        """
        # Récupérer les dépenses non catégorisées
        uncategorized = Expense.query.filter_by(category_id=None).all()
        
        count = 0
        for expense in uncategorized:
            if AutoCategorizationService.apply_rules_to_expense(expense):
                count += 1
        
        # Sauvegarder les modifications
        db.session.commit()
        
        return count

    @staticmethod
    def find_conflicting_rules(rule_data, expense_id=None):
        """
        Trouve les règles existantes qui entreraient en conflit avec une nouvelle règle
        
        Args:
            rule_data (dict): Données de la nouvelle règle
            expense_id (int, optional): ID de la dépense utilisée pour créer la règle
            
        Returns:
            list: Liste des règles qui entreraient en conflit avec la nouvelle règle
        """
        # Créer une instance temporaire pour les vérifications
        temp_rule = AutoCategorizationRule(
            name="Règle temporaire",
            merchant_contains=rule_data.get('merchant_contains', ''),
            description_contains=rule_data.get('description_contains', ''),
            min_amount=rule_data.get('min_amount'),
            max_amount=rule_data.get('max_amount')
        )
        
        # Récupérer toutes les dépenses non catégorisées
        uncategorized_expenses = Expense.query.filter_by(category_id=None).all()
        
        # Trouver les dépenses qui correspondraient à cette règle
        matching_expenses = []
        for expense in uncategorized_expenses:
            if expense.id != expense_id and temp_rule.matches_expense(expense):
                matching_expenses.append(expense)
        
        # Si aucune dépense ne correspond, il n'y a pas de conflit
        if not matching_expenses:
            return []
        
        # Trouver les règles existantes qui correspondent à ces dépenses
        conflicts = []
        existing_rules = AutoCategorizationRule.query.all()
        
        for rule in existing_rules:
            # Ignorer les règles avec la même destination (catégorie et flag)
            if (rule.category_id == rule_data.get('category_id') and 
                rule.flag_id == rule_data.get('flag_id')):
                continue
                
            # Vérifier chaque dépense pour un conflit
            conflict_expenses = []
            for expense in matching_expenses:
                if rule.matches_expense(expense):
                    conflict_expenses.append(expense)
                    
            # S'il y a des dépenses en conflit, ajouter à la liste des conflits
            if conflict_expenses:
                conflicts.append({
                    'rule': rule,
                    'expenses': conflict_expenses
                })
        
        return conflicts