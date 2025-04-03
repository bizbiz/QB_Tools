# app/services/teamplanning/event_extractor.py
"""
Module pour extraire les événements du planning Netplanning
"""

import re
from app.services.teamplanning.extractor_base import ExtractorBase
from app.services.teamplanning.user_extractor import UserExtractor

class EventExtractor(ExtractorBase):
    """
    Classe pour extraire les événements du planning
    """
    
    @classmethod
    def extract_planning_events(cls, html_content, limit_to_first_user=True, extract_first_line_only=True):
        """
        Extrait les événements du planning HTML
        
        Args:
            html_content (str): Contenu HTML brut
            limit_to_first_user (bool): Si True, extrait seulement pour le premier utilisateur
            extract_first_line_only (bool): Si True, extrait seulement les événements du matin
            
        Returns:
            dict: Informations sur les événements par utilisateur et par jour
        """
        soup = cls.create_soup(html_content)
        
        # Structure pour stocker les résultats
        events_data = {
            'users': {},  # Dictionnaire où les clés sont les noms d'utilisateurs
            'period': {},  # Infos sur la période (mois, année)
            'summary': {}  # Statistiques globales
        }
        
        try:
            # Trouver tous les tbody avec la classe "bress"
            table, _, tbodies = cls.find_table_and_sections(soup)
            if not table or not tbodies:
                return events_data
                
            # Nous ne cherchons plus spécifiquement la classe "bress" car elle peut ne pas être présente
            # Nous prenons tous les tbody sauf le premier (qui contient les en-têtes)
            user_tbodies = tbodies[1:] if tbodies else []
            
            if not user_tbodies:
                return events_data
            
            for tbody_index, tbody in enumerate(user_tbodies):
                # Si on veut limiter au premier utilisateur et qu'on a déjà traité un tbody
                if limit_to_first_user and tbody_index > 0:
                    break
                
                # Trouver toutes les lignes (tr) dans ce tbody
                rows = tbody.find_all('tr')
                
                if not rows:
                    continue
                
                # Le nom de l'utilisateur devrait être dans le premier td du premier tr
                first_row = rows[0]
                cells = first_row.find_all('td')
                
                # Il faut au moins deux cellules (la première est vide, la deuxième contient le nom)
                if len(cells) < 2:
                    continue
                
                # Extraire le nom de l'utilisateur à partir du second td
                user_td = cells[1]
                if 'nom_ress' not in user_td.get('class', []):
                    continue
                
                user_name = UserExtractor._extract_user_name(user_td)
                if not user_name:
                    continue
                
                # Initialiser les données pour cet utilisateur
                events_data['users'][user_name] = {
                    'days': {}  # Dictionnaire où les clés sont les numéros de jours
                }
                
                # Traiter chaque ligne (matin, journée, soir)
                for row_index, row in enumerate(rows):
                    # Si on veut seulement la première ligne et qu'on est sur une ligne supplémentaire
                    if extract_first_line_only and row_index > 0:
                        break
                    
                    # Déterminer le créneau horaire (matin, journée, soir)
                    time_slot = ['morning', 'day', 'evening'][row_index] if row_index < 3 else 'extra'
                    
                    # Les cellules commencent à partir de la 3e (après la marge et le nom)
                    event_cells = row.find_all('td')[2:] if row_index == 0 else row.find_all('td')
                    
                    for day_index, event_td in enumerate(event_cells, start=1):
                        # Extraire le jour associé à cette cellule
                        day = cls._extract_day_from_cell(event_td, day_index)
                        if not day:
                            continue
                        
                        # Extraire les informations de l'événement
                        event_info = cls._extract_event_info(event_td)
                        
                        # Stocker l'événement pour cet utilisateur, ce jour et ce créneau
                        if day not in events_data['users'][user_name]['days']:
                            events_data['users'][user_name]['days'][day] = {}
                        
                        events_data['users'][user_name]['days'][day][time_slot] = event_info
            
            # Calculer les statistiques globales
            events_data['summary'] = cls._calculate_events_summary(events_data['users'])
            
        except Exception as e:
            events_data['error'] = str(e)
        
        return events_data
    
    @staticmethod
    def _extract_day_from_cell(cell, day_index=None):
        """
        Extrait le numéro du jour à partir d'une cellule d'événement
        
        Args:
            cell (Tag): Cellule HTML contenant l'événement
            day_index (int): Indice du jour, utilisé comme fallback
            
        Returns:
            int: Numéro du jour
        """
        # Essayer d'extraire à partir de l'ID de la cellule
        cell_id = cell.get('id', '')
        if cell_id and 'jour_' in cell_id:
            try:
                return int(cell_id.split('_')[1])
            except (ValueError, IndexError):
                pass
        
        # Essayer d'extraire à partir des classes
        for cls in cell.get('class', []):
            # Certaines classes sont des nombres qui représentent le jour
            if cls.isdigit():
                return int(cls)
        
        # Essayer d'extraire à partir du lien à l'intérieur
        a_elem = cell.find('a')
        if a_elem:
            # Extraire le jour du paramètre jour dans l'attribut href
            href = a_elem.get('href', '')
            day_match = re.search(r'jour=(\d+)', href)
            if day_match:
                return int(day_match.group(1))
            
            # Essayer d'extraire depuis la classe ou l'ID du lien
            for cls in a_elem.get('class', []):
                if cls.isdigit():
                    return int(cls)
            
            a_id = a_elem.get('id', '')
            if a_id and a_id.isdigit():
                return int(a_id)
        
        # Utiliser l'indice comme dernier recours
        return day_index
    
    @staticmethod
    def _extract_event_info(cell):
        """
        Extrait les informations d'un événement à partir d'une cellule
        
        Args:
            cell (Tag): Cellule HTML contenant l'événement
            
        Returns:
            dict: Informations de l'événement
        """
        event_info = {
            'content': None,        # Texte de l'événement (ex: "TL")
            'type': None,           # Type d'événement déduit de la couleur
            'comment': None,        # Commentaire éventuel
            'last_modified': None,  # Date de dernière modification
            'author': None,         # Auteur de la dernière modification
            'color': None,          # Classe CSS de couleur
            'is_empty': True,       # Indique si la cellule est vide
            'is_weekend': False     # Indique si c'est un weekend
        }
        
        # Vérifier s'il s'agit d'un weekend
        if 'WE' in cell.get('class', []):
            event_info['is_weekend'] = True
            event_info['type'] = 'weekend'
            return event_info
        
        # Extraire le contenu principal de l'événement
        href_div = cell.find('div', class_='href')
        if href_div:
            content = href_div.get_text(strip=True)
            if content:
                event_info['content'] = content
                event_info['is_empty'] = False
        
        # Extraire le commentaire éventuel
        comment_span = cell.find('span', class_=lambda c: c and 'arrondi' in c.split())
        if comment_span:
            comment = comment_span.get_text(strip=True)
            if comment:
                event_info['comment'] = comment
                event_info['is_empty'] = False
        
        # Extraire l'auteur et la date de dernière modification
        modified_p = cell.find('p', style=lambda s: s and 'background: blue' in s)
        if modified_p:
            modified_text = modified_p.get_text(strip=True)
            # Format: "26/03/2025 - 08:43 (Benjamin SEBILE)"
            import re
            match = re.match(r'(\d{2}/\d{2}/\d{4} - \d{2}:\d{2}) \((.*?)\)', modified_text)
            if match:
                event_info['last_modified'] = match.group(1)
                event_info['author'] = match.group(2)
        
        # Extraire la couleur/type de l'événement
        color_classes = [
            'greenyellow', 'b_greenyellow',  # Télétravail
            'b_maroon', 'maroon',            # Réunion
            'redyellow',                     # RTE
            'tomato', 'b_tomato',            # Congés
            'gold', 'b_gold',                # Permanence
            'orange', 'b_orange',            # Permanence matin
            'teal', 'b_teal',                # Garde sur site
            'blackwhite', 'b_blackwhite'     # Congés posés
        ]
        
        for cls in cell.get('class', []):
            if cls in color_classes:
                event_info['color'] = cls
                break
        
        # Déterminer le type d'événement en fonction du contenu et de la couleur
        if event_info['content'] == 'TL' and event_info['color'] in ['greenyellow', 'b_greenyellow']:
            event_info['type'] = 'telework'  # Télétravail
        elif event_info['content'] == 'R' and event_info['color'] in ['b_maroon', 'maroon']:
            event_info['type'] = 'meeting'   # Réunion
        elif event_info['content'] == 'RTE' and event_info['color'] in ['redyellow']:
            event_info['type'] = 'rte'       # RTE
        elif event_info['content'] == 'C' and event_info['color'] in ['tomato', 'b_tomato']:
            event_info['type'] = 'vacation'  # Congés
        elif event_info['content'] == 'P' and event_info['color'] in ['gold', 'b_gold']:
            event_info['type'] = 'duty'      # Permanence
        elif event_info['content'] == 'Pm' and event_info['color'] in ['orange', 'b_orange']:
            event_info['type'] = 'morning_duty'  # Permanence matin
        elif event_info['content'] == 'GS' and event_info['color'] in ['teal', 'b_teal']:
            event_info['type'] = 'onsite'    # Garde sur site
        elif event_info['content'] == 'CP' and event_info['color'] in ['blackwhite', 'b_blackwhite']:
            event_info['type'] = 'leave'     # Congés posés
        elif not event_info['content'] and event_info['color'] in ['b_greenyellow']:
            event_info['type'] = 'holiday'   # Jour férié
        elif event_info['is_empty']:
            event_info['type'] = 'empty'     # Cellule vide
        else:
            event_info['type'] = 'unknown'   # Type non identifié
        
        return event_info
    
    @staticmethod
    def _calculate_events_summary(users_data):
        """
        Calcule des statistiques sur les événements
        
        Args:
            users_data (dict): Données des utilisateurs et leurs événements
            
        Returns:
            dict: Statistiques résumées
        """
        summary = {
            'total_events': 0,
            'events_by_type': {},
            'users_count': len(users_data)
        }
        
        # Parcourir tous les utilisateurs et leurs événements
        for user, user_data in users_data.items():
            for day, day_data in user_data.get('days', {}).items():
                for time_slot, event_info in day_data.items():
                    if not event_info.get('is_empty', True):
                        summary['total_events'] += 1
                        
                        # Comptabiliser par type d'événement
                        event_type = event_info.get('type', 'unknown')
                        if event_type not in summary['events_by_type']:
                            summary['events_by_type'][event_type] = 0
                        summary['events_by_type'][event_type] += 1
        
        return summary