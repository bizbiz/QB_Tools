# app/services/teamplanning/__init__.py
"""
Module d'extraction et de traitement des données Teamplanning
"""

from app.services.teamplanning.user_extractor import UserExtractor
from app.services.teamplanning.date_extractor import DateExtractor
from app.services.teamplanning.event_extractor import EventExtractor

"""
Façade unifiée pour toutes les fonctionnalités d'extraction Netplanning.
Délègue aux classes spécialisées.
""" 
# Classe principale qui regroupe les fonctionnalités d'extraction
class NetplanningExtractor:


    """
    Extrait uniquement les métadonnées du planning (utilisateurs et dates)
    
    Args:
        html_content (str): Contenu HTML brut
        
    Returns:
        dict: Métadonnées du planning
    """

    @staticmethod
    def extract_metadata(html_content):
        # Extraire les utilisateurs
        users = UserExtractor.extract_users(html_content)
        
        # Extraire les informations de dates
        dates_info = DateExtractor.extract_planning_dates(html_content)
        
        return {
            'users': users,
            'dates': dates_info,
            'success': True
        }

    @staticmethod
    def extract_specific_days(html_content, days_to_extract=None, user_index=0):
        """
        Extrait des jours spécifiques en utilisant la même méthode que debug_day
        
        Args:
            html_content (str): Contenu HTML brut
            days_to_extract (list): Liste des jours à extraire, ou None pour tous
            user_index (int): Indice de l'utilisateur à extraire
            
        Returns:
            dict: Informations sur les événements
        """
        return EventExtractor.extract_specific_days(html_content, days_to_extract, user_index)
    
    @staticmethod
    def extract_users(html_content):
        """
        Extrait les noms des utilisateurs du HTML Netplanning
        
        Args:
            html_content (str): Contenu HTML brut
            
        Returns:
            list: Liste des noms d'utilisateurs trouvés
        """
        return UserExtractor.extract_users(html_content)
    
    @staticmethod
    def extract_planning_dates(html_content):
        """
        Extrait les dates du planning depuis le HTML
        
        Args:
            html_content (str): Contenu HTML brut
            
        Returns:
            dict: Informations sur les dates (mois, année, jours)
        """
        return DateExtractor.extract_planning_dates(html_content)
    
    @staticmethod
    def extract_planning_events(html_content, limit_to_first_user=True, extract_first_line_only=True):
        """
        Extrait les événements du planning HTML
        
        Args:
            html_content (str): Contenu HTML brut
            limit_to_first_user (bool): Si True, extrait seulement pour le premier utilisateur
            extract_first_line_only (bool): Si True, extrait seulement les événements du matin
            
        Returns:
            dict: Informations sur les événements par utilisateur et par jour
        """
        return EventExtractor.extract_planning_events(
            html_content, 
            limit_to_first_user, 
            extract_first_line_only
        )
    
    @staticmethod
    def debug_day(html_content, day_to_debug, user_index=0):
        """
        Fonction de débogage pour analyser un jour spécifique
        
        Args:
            html_content (str): Contenu HTML brut
            day_to_debug (int): Jour à déboguer
            user_index (int): Indice de l'utilisateur (0 par défaut)
            
        Returns:
            dict: Informations détaillées sur le jour
        """
        return EventExtractor.debug_day(html_content, day_to_debug, user_index)
    
    @staticmethod
    def debug_cell(cell, day_index=None):
        """
        Fonction de débogage pour analyser une cellule en détail
        
        Args:
            cell (Tag): Cellule HTML à analyser
            day_index (int): Indice du jour pour référence
            
        Returns:
            dict: Informations détaillées sur la cellule
        """
        return EventExtractor.debug_cell(cell, day_index)