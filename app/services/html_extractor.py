# app/services/html_extractor.py
"""
Service pour extraire des informations des documents HTML de Netplanning
"""

from bs4 import BeautifulSoup

class NetplanningExtractor:
    """
    Classe utilitaire pour extraire des informations du HTML de Netplanning.
    """
    
    @staticmethod
    def extract_users(html_content):
        """
        Extrait les noms des utilisateurs du HTML Netplanning
        
        Args:
            html_content (str): Contenu HTML brut
            
        Returns:
            list: Liste des noms d'utilisateurs trouvés
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        users = []
        
        # Trouver le tableau principal
        table = soup.find('table', id='tableau')
        
        if not table:
            return []
        
        # Parcourir tous les tbody (sauf le premier qui contient les en-têtes)
        tbodies = table.find_all('tbody')
        for tbody in tbodies[1:]:  # Ignorer le premier tbody
            # Chercher le td qui contient le nom de la personne
            person_td = tbody.find('td', class_='nom_ress')
            
            if person_td:
                full_name = None
                
                # Méthode 1: Élément standard avec class="ressource"
                ress_element = person_td.find('ress', class_='ressource')
                if ress_element:
                    # Extraire le nom et prénom
                    name_text = ress_element.get_text(strip=True)
                    
                    # Rechercher le prénom qui est souvent dans un élément <p class="pn">
                    pn_element = ress_element.find('p', class_='pn')
                    
                    if pn_element:
                        # Format: "NOM <p class='pn'>Prénom</p>"
                        lastname = name_text.replace(pn_element.get_text(strip=True), '').strip()
                        firstname = pn_element.get_text(strip=True)
                        full_name = f"{lastname} {firstname}".strip()
                    else:
                        # Si on ne trouve pas la structure attendue, utiliser le texte complet
                        full_name = name_text
                
                # Méthode 2: Format alternatif avec <p class="rouge">
                if not full_name:
                    p_rouge_element = person_td.find('p', class_='rouge')
                    if p_rouge_element:
                        # Extraire le nom depuis le format <p class="rouge">&nbsp;<b>NOM</b>&nbsp;Prénom</p>
                        full_name = p_rouge_element.get_text(strip=True)
                
                # Méthode 3: Dernier recours, juste prendre tout le texte de la cellule
                if not full_name:
                    # Prendre tout le texte de la cellule et essayer de le nettoyer
                    raw_text = person_td.get_text(strip=True)
                    # Nettoyer au besoin (éliminer les textes non pertinents comme "Coordinateur", etc.)
                    # Version simplifiée, à ajuster si nécessaire
                    full_name = raw_text.split('\n')[0] if '\n' in raw_text else raw_text
                
                # Ajouter à la liste s'il n'est pas déjà présent et non vide
                if full_name and full_name.strip() and full_name not in users:
                    users.append(full_name.strip())
        
        return sorted(users)  # Trier par ordre alphabétique
    
    @staticmethod
    def extract_planning_dates(html_content):
        """
        Extrait les dates du planning depuis le HTML
        
        Args:
            html_content (str): Contenu HTML brut
            
        Returns:
            dict: Informations sur les dates (mois, année, jours)
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Informations à extraire
        dates_info = {
            'month': None,
            'year': None,
            'days': []
        }
        
        # Pour l'instant, méthode simple pour obtenir les dates
        # À compléter selon la structure exacte de Netplanning
        
        return dates_info