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
        
        # Appliquer les filtres
        merchant_pattern = filters.get('merchant_contains') or expense.merchant.strip().lower()
        if merchant_pattern:
            query = query.filter(Expense.merchant.ilike(f'%{merchant_pattern}%'))
        
        description_pattern = filters.get('description_contains')
        if description_pattern:
            query = query.filter(Expense.description.ilike(f'%{description_pattern}%'))
        
        # Appliquer les filtres de fréquence
        frequency_type = filters.get('frequency_type')
        frequency_day = filters.get('frequency_day')
        
        if frequency_type and frequency_type != 'none' and frequency_day is not None:
            if frequency_type == 'monthly':
                # Filtrer par jour du mois
                from sqlalchemy import extract
                query = query.filter(extract('day', Expense.date) == frequency_day)
            elif frequency_type == 'weekly':
                # Filtrer par jour de la semaine (0=lundi, 6=dimanche)
                query = query.filter(extract('dow', Expense.date) == frequency_day)
        
        # Exécuter la requête
        return query.all()
    
    @staticmethod
    def detect_frequency(expenses):
        """
        Détecte la fréquence potentielle d'une série de dépenses
        
        Args:
            expenses (list): Liste des dépenses à analyser
            
        Returns:
            dict: Informations sur la fréquence détectée
        """
        if not expenses or len(expenses) < 2:
            return {'type': None, 'day': None, 'confidence': 0}
        
        # Trier les dépenses par date
        sorted_expenses = sorted(expenses, key=lambda e: e.date)
        
        # Vérifier la fréquence mensuelle (même jour du mois)
        days_of_month = [e.date.day for e in sorted_expenses]
        most_common_day = max(set(days_of_month), key=days_of_month.count)
        monthly_confidence = days_of_month.count(most_common_day) / len(days_of_month)
        
        # Vérifier la fréquence hebdomadaire (même jour de la semaine)
        weekdays = [e.date.weekday() for e in sorted_expenses]
        most_common_weekday = max(set(weekdays), key=weekdays.count)
        weekly_confidence = weekdays.count(most_common_weekday) / len(weekdays)
        
        # Déterminer la fréquence avec la plus grande confiance
        if monthly_confidence > weekly_confidence and monthly_confidence > 0.5:
            return {
                'type': 'monthly',
                'day': most_common_day,
                'confidence': monthly_confidence
            }
        elif weekly_confidence > 0.5:
            return {
                'type': 'weekly',
                'day': most_common_weekday,
                'confidence': weekly_confidence
            }
        else:
            return {'type': None, 'day': None, 'confidence': 0}
    
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
                            'include_in_tricount': category.include_in_tricount,
                            'is_professional': category.is_professional,
                            'confidence': 0.8
                        }
        
        # Si aucune correspondance, retourner des valeurs par défaut
        return {
            'category_id': None,
            'include_in_tricount': False,
            'is_professional': False,
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
        # Ne pas catégoriser les dépenses déjà catégorisées
        if expense.category_id is not None:
            return False
        
        # Récupérer toutes les règles
        rules = AutoCategorizationRule.query.all()
        
        for rule in rules:
            if rule.matches_expense(expense):
                # Appliquer la règle
                expense.category_id = rule.category_id
                expense.include_in_tricount = rule.include_in_tricount
                expense.is_professional = rule.is_professional
                return True
        
        return False
    
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