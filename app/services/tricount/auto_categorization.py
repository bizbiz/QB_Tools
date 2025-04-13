# app/services/tricount/auto_categorization.py
from app.models.tricount import Expense, AutoCategorizationRule, PendingRuleApplication, ModificationSource
from app.utils.rename_helpers import apply_rule_rename
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
        if not expense:
            return []
        
        # Initialiser les filtres par défaut
        if filters is None:
            filters = {}
        
        # Récupérer les valeurs des filtres ou utiliser les valeurs de la dépense
        merchant_contains = filters.get('merchant_contains', expense.merchant)
        description_contains = filters.get('description_contains', '')
        min_amount = filters.get('min_amount')
        max_amount = filters.get('max_amount')
        search_original_text = filters.get('search_original_text', False)
        
        # Construire la requête
        query = Expense.query
        
        # Exclure la dépense de référence si elle existe dans la base
        if expense.id > 0:  # Si l'ID est valide (pas une dépense fictive)
            query = query.filter(Expense.id != expense.id)
        
        # Filtrer par marchand
        if merchant_contains:
            if search_original_text:
                from sqlalchemy import or_
                query = query.filter(or_(
                    Expense.merchant.ilike(f'%{merchant_contains}%'),
                    Expense.original_text.ilike(f'%{merchant_contains}%')
                ))
            else:
                query = query.filter(Expense.merchant.ilike(f'%{merchant_contains}%'))
        
        # Filtrer par description
        if description_contains:
            query = query.filter(Expense.description.ilike(f'%{description_contains}%'))
        
        # Filtrer par montant minimum
        if min_amount is not None:
            try:
                min_amount_float = float(min_amount)
                query = query.filter(Expense.amount >= min_amount_float)
            except (ValueError, TypeError):
                pass  # Ignorer les valeurs non valides
        
        # Filtrer par montant maximum
        if max_amount is not None:
            try:
                max_amount_float = float(max_amount)
                query = query.filter(Expense.amount <= max_amount_float)
            except (ValueError, TypeError):
                pass  # Ignorer les valeurs non valides
        
        # Récupérer et retourner les résultats (limités à 50 pour éviter les problèmes de performance)
        return query.limit(50).all()
    
    @staticmethod
    def suggest_category(expense):
        """
        Suggère une catégorie pour une dépense basée sur son marchand
        
        Args:
            expense (Expense): Dépense à catégoriser
            
        Returns:
            dict: Suggestion de catégorie
        """
        # [Code existant inchangé]
        pass
    
    @staticmethod
    def apply_rules_to_expense(expense, respect_manual=True):
        """
        Applique les règles d'auto-catégorisation à une dépense
        
        Args:
            expense (Expense): Dépense à catégoriser
            respect_manual (bool): Si True, ne pas écraser les modifications manuelles
            
        Returns:
            dict: Résultat de l'application des règles
        """
        # Récupérer toutes les règles
        rules = AutoCategorizationRule.query.all()
        
        applied = False
        pending = False
        
        for rule in rules:
            if rule.matches_expense(expense):
                # Si la règle nécessite une confirmation, l'ajouter aux applications en attente
                if rule.requires_confirmation:
                    # Vérifier si cette règle n'est pas déjà en attente pour cette dépense
                    existing = PendingRuleApplication.query.filter_by(
                        rule_id=rule.id, 
                        expense_id=expense.id
                    ).first()
                    
                    if not existing:
                        pending_application = PendingRuleApplication(
                            rule_id=rule.id,
                            expense_id=expense.id
                        )
                        db.session.add(pending_application)
                        pending = True
                else:
                    # Appliquer directement les modifications selon les options activées
                    if rule.apply_category and rule.category_id:
                        # Ne pas écraser une catégorie définie manuellement
                        if not (expense.category_modified_by == ModificationSource.MANUAL.value and respect_manual):
                            expense.category_id = rule.category_id
                            expense.category_modified_by = ModificationSource.AUTO_RULE.value
                    
                    if rule.apply_flag and rule.flag_id:
                        # Ne pas écraser un flag défini manuellement
                        if not (expense.flag_modified_by == ModificationSource.MANUAL.value and respect_manual):
                            expense.flag_id = rule.flag_id
                            expense.flag_modified_by = ModificationSource.AUTO_RULE.value
                    
                    if rule.apply_rename and rule.rename_pattern:
                        # Ne pas renommer si modifié manuellement
                        if not (expense.merchant_modified_by == ModificationSource.MANUAL.value and respect_manual):
                            # Appliquer le renommage si configuré
                            apply_rule_rename(expense, rule)
                    
                    # Enregistrer la relation entre la règle et la dépense
                    rule.affected_expenses.append(expense)
                    applied = True
                    
                    # Sortir de la boucle après la première règle appliquée
                    break
        
        if pending or applied:
            db.session.commit()
            
        return {'applied': applied, 'pending': pending}
    
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