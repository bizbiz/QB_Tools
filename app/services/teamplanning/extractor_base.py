# app/services/teamplanning/extractor_base.py
"""
Classe de base et utilitaires pour l'extraction de données Netplanning
"""

from bs4 import BeautifulSoup

class ExtractorBase:
    """
    Classe de base avec des fonctions utilitaires pour l'extraction
    """
    
    @staticmethod
    def create_soup(html_content):
        """
        Crée un objet BeautifulSoup à partir du contenu HTML
        
        Args:
            html_content (str): Contenu HTML brut
            
        Returns:
            BeautifulSoup: Objet BeautifulSoup pour le parsing
        """
        return BeautifulSoup(html_content, 'html.parser')
    
    @staticmethod
    def find_table_and_sections(soup):
        """
        Trouve le tableau principal et ses sections
        
        Args:
            soup (BeautifulSoup): Objet BeautifulSoup
            
        Returns:
            tuple: (tableau, thead, corps du tableau)
        """
        table = soup.find('table', id='tableau')
        
        if not table:
            return None, None, None
        
        thead = table.find('thead')
        tbodies = table.find_all('tbody')
        
        return table, thead, tbodies