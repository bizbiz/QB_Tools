# app/services/teamplanning/user_extractor.py
"""
Module pour extraire les utilisateurs du planning Netplanning
"""

from app.services.teamplanning.extractor_base import ExtractorBase

class UserExtractor(ExtractorBase):
    """
    Classe pour extraire les informations des utilisateurs
    """
    
    @classmethod
    def extract_users(cls, html_content):
        """
        Extrait les noms des utilisateurs du HTML Netplanning
        
        Args:
            html_content (str): Contenu HTML brut
            
        Returns:
            list: Liste des noms d'utilisateurs trouvés
        """
        soup = cls.create_soup(html_content)
        users = []
        
        # Trouver le tableau principal
        table, _, tbodies = cls.find_table_and_sections(soup)
        
        if not table or not tbodies:
            return []
        
        # Parcourir tous les tbody (sauf le premier qui contient les en-têtes)
        for tbody in tbodies[1:]:  # Ignorer le premier tbody
            # Chercher le td qui contient le nom de la personne
            person_td = tbody.find('td', class_='nom_ress')
            
            if person_td:
                full_name = cls._extract_user_name(person_td)
                
                # Ajouter à la liste s'il n'est pas déjà présent et non vide
                if full_name and full_name.strip() and full_name not in users:
                    users.append(full_name.strip())
        
        return sorted(users)  # Trier par ordre alphabétique
    
    @staticmethod
    def _extract_user_name(user_td):
        """
        Extrait le nom d'utilisateur à partir d'une cellule td
        
        Args:
            user_td (Tag): Balise td contenant le nom de l'utilisateur
            
        Returns:
            str: Nom complet de l'utilisateur
        """
        # Méthode 1: Élément standard avec class="ressource"
        ress_element = user_td.find('ress', class_='ressource')
        if ress_element:
            # Extraire le nom et prénom
            name_text = ress_element.get_text(strip=True)
            
            # Rechercher le prénom qui est souvent dans un élément <p class="pn">
            pn_element = ress_element.find('p', class_='pn')
            
            if pn_element:
                # Format: "NOM <p class='pn'>Prénom</p>"
                lastname = name_text.replace(pn_element.get_text(strip=True), '').strip()
                firstname = pn_element.get_text(strip=True)
                return f"{lastname} {firstname}".strip()
            else:
                # Si on ne trouve pas la structure attendue, utiliser le texte complet
                return name_text
        
        # Méthode 2: Format alternatif avec <p class="rouge">
        p_rouge_element = user_td.find('p', class_='rouge')
        if p_rouge_element:
            # Extraire le nom depuis le format <p class="rouge">&nbsp;<b>NOM</b>&nbsp;Prénom</p>
            raw_text = p_rouge_element.get_text(strip=True)
            
            # Rechercher si le nom est dans un élément <b>
            b_element = p_rouge_element.find('b')
            if b_element:
                lastname = b_element.get_text(strip=True)
                # Extraire le prénom en supprimant le nom du texte complet
                firstname = raw_text.replace(lastname, '').strip()
                return f"{lastname} {firstname}".strip()
            else:
                # Si pas d'élément <b>, essayer de séparer par les espaces
                parts = raw_text.split()
                if len(parts) >= 2:
                    # Supposer que le premier élément est le nom et le reste est le prénom
                    lastname = parts[0]
                    firstname = ' '.join(parts[1:])
                    return f"{lastname} {firstname}"
                else:
                    return raw_text
        
        # Méthode 3: Dernier recours, juste prendre tout le texte de la cellule
        raw_text = user_td.get_text(strip=True)
        return raw_text.split('\n')[0] if '\n' in raw_text else raw_text