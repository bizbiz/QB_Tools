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
        
        # Variable pour le débogage - à supprimer en production
        debug_info = {
            'tables_found': 0,
            'tbodies_found': 0,
            'users_processed': 0,
            'rows_processed': 0,
            'cells_processed': 0,
            'events_found': 0
        }
        
        try:
            # 1. Chercher toutes les tables possibles
            tables = soup.find_all('table')
            debug_info['tables_found'] = len(tables)
            
            main_table = None
            
            # Essayer d'abord de trouver la table avec id="tableau"
            main_table = soup.find('table', id='tableau')
            
            # Si non trouvé, prendre la plus grande table (avec le plus de lignes)
            if not main_table and tables:
                # Trouver la table qui a le plus de lignes
                main_table = max(tables, key=lambda t: len(t.find_all('tr')), default=None)
            
            if not main_table:
                events_data['error'] = "Aucune table principale n'a été trouvée dans le HTML"
                events_data['debug'] = debug_info
                return events_data
                
            # 2. Trouver tous les tbodies (sauf possiblement le premier qui contient les en-têtes)
            tbodies = main_table.find_all('tbody')
            debug_info['tbodies_found'] = len(tbodies)
            
            # Si aucun tbody explicite n'est trouvé, chercher directement les lignes tr
            if not tbodies:
                all_rows = main_table.find_all('tr')
                # Les premières lignes sont probablement des en-têtes
                user_rows = all_rows[2:] if len(all_rows) > 2 else all_rows
                
                # Grouper les lignes par utilisateur
                # Supposons que chaque utilisateur a 3 lignes (matin, journée, soir)
                user_groups = []
                current_group = []
                
                for i, row in enumerate(user_rows):
                    current_group.append(row)
                    if (i + 1) % 3 == 0:  # Tous les 3 lignes
                        user_groups.append(current_group)
                        current_group = []
                
                # Ajouter le dernier groupe s'il est incomplet
                if current_group:
                    user_groups.append(current_group)
                
                # Traiter chaque groupe comme un "tbody"
                for group_idx, group in enumerate(user_groups):
                    if limit_to_first_user and group_idx > 0:
                        break
                    
                    # Chercher le nom d'utilisateur dans la première ligne
                    first_row = group[0]
                    cells = first_row.find_all('td')
                    
                    # Trouver la cellule qui contient le nom (généralement la 2e)
                    user_td = None
                    for i, cell in enumerate(cells):
                        if 'nom_ress' in cell.get('class', []) or i == 1:  # Soit la classe spécifique, soit la 2e cellule
                            user_td = cell
                            break
                    
                    if not user_td:
                        continue  # Impossible de déterminer l'utilisateur
                    
                    user_name = UserExtractor._extract_user_name(user_td)
                    if not user_name:
                        user_name = f"Utilisateur {group_idx + 1}"  # Fallback
                    
                    # Initialiser les données pour cet utilisateur
                    events_data['users'][user_name] = {
                        'days': {}  # Dictionnaire où les clés sont les numéros de jours
                    }
                    
                    debug_info['users_processed'] += 1
                    
                    # Traiter chaque ligne (matin, journée, soir)
                    for row_idx, row in enumerate(group):
                        if extract_first_line_only and row_idx > 0:
                            break
                        
                        # Déterminer le créneau horaire en fonction de l'index
                        time_slots = ['morning', 'day', 'evening']
                        time_slot = time_slots[row_idx] if row_idx < len(time_slots) else f"extra_{row_idx}"
                        
                        debug_info['rows_processed'] += 1
                        
                        # Déterminer quelles cellules contiennent des événements
                        cells = row.find_all('td')
                        
                        # Ignorer les premières cellules non-événement (généralement 1 ou 2)
                        # Le nombre peut varier, essayons d'être adaptatifs
                        start_idx = 0
                        
                        # Si c'est la première ligne (matin), ça peut être différent
                        if row_idx == 0:
                            # Chercher la cellule avec le nom d'utilisateur ou similaire
                            for i, cell in enumerate(cells):
                                if 'nom_ress' in cell.get('class', []) or i == 1:
                                    start_idx = i + 1  # Commencer après cette cellule
                                    break
                            
                            if start_idx == 0 and len(cells) > 2:
                                # Par défaut, commencer à la 3e cellule pour la première ligne
                                start_idx = 2
                        
                        # Traiter chaque cellule d'événement
                        for cell_idx, cell in enumerate(cells[start_idx:], start=1):
                            debug_info['cells_processed'] += 1
                            
                            # Extraire le jour associé à cette cellule
                            day = cls._extract_day_from_cell(cell, cell_idx)
                            
                            # Nous utilisons maintenant day comme clé, qu'il soit un entier ou une chaîne
                            day_key = str(day)
                            
                            # Extraire les informations de l'événement
                            event_info = cls._extract_event_info(cell)
                            
                            # Si l'événement n'est pas vide, le comptabiliser
                            if not event_info['is_empty'] or event_info['is_weekend']:
                                debug_info['events_found'] += 1
                            
                            # Stocker l'événement
                            if day_key not in events_data['users'][user_name]['days']:
                                events_data['users'][user_name]['days'][day_key] = {}
                            
                            events_data['users'][user_name]['days'][day_key][time_slot] = event_info
            else:
                # Si nous avons trouvé des tbody explicites, les traiter normalement
                # Ignorer le premier tbody qui contient généralement les en-têtes
                user_tbodies = tbodies[1:] if len(tbodies) > 1 else tbodies
                
                for tbody_idx, tbody in enumerate(user_tbodies):
                    if limit_to_first_user and tbody_idx > 0:
                        break
                    
                    # Trouver toutes les lignes (tr) dans ce tbody
                    rows = tbody.find_all('tr')
                    
                    if not rows:
                        continue
                    
                    # Chercher le nom de l'utilisateur dans la première ligne
                    first_row = rows[0]
                    cells = first_row.find_all('td')
                    
                    # Il faut au moins deux cellules (la première est vide, la deuxième contient le nom)
                    if len(cells) < 2:
                        continue
                    
                    # Extraire le nom de l'utilisateur à partir du second td
                    user_td = cells[1]
                    if 'nom_ress' not in user_td.get('class', []) and len(cells) > 2:
                        # Essayer la 3e cellule si la 2e n'a pas la bonne classe
                        user_td = cells[2]
                    
                    user_name = UserExtractor._extract_user_name(user_td)
                    if not user_name:
                        user_name = f"Utilisateur {tbody_idx + 1}"  # Fallback
                    
                    # Initialiser les données pour cet utilisateur
                    events_data['users'][user_name] = {
                        'days': {}  # Dictionnaire où les clés sont les numéros de jours
                    }
                    
                    debug_info['users_processed'] += 1
                    
                    # Traiter chaque ligne (généralement 3: matin, journée, soir)
                    for row_idx, row in enumerate(rows):
                        if extract_first_line_only and row_idx > 0:
                            break
                        
                        # Déterminer le créneau horaire en fonction de l'index
                        time_slots = ['morning', 'day', 'evening']
                        time_slot = time_slots[row_idx] if row_idx < len(time_slots) else f"extra_{row_idx}"
                        
                        debug_info['rows_processed'] += 1
                        
                        # Déterminer quelles cellules contiennent des événements
                        cells = row.find_all('td')
                        start_idx = 2 if row_idx == 0 else 0  # Ignorer les 2 premières cellules pour la première ligne
                        
                        # Pour les lignes suivantes, il n'y a pas de cellule de nom
                        # Donc nous commençons au début
                        
                        # Traiter chaque cellule d'événement
                        for cell_idx, cell in enumerate(cells[start_idx:], start=1):
                            debug_info['cells_processed'] += 1
                            
                            # Extraire le jour associé à cette cellule
                            day = cls._extract_day_from_cell(cell, cell_idx)
                            
                            # Nous utilisons maintenant day comme clé, qu'il soit un entier ou une chaîne
                            day_key = str(day)
                            
                            # Extraire les informations de l'événement
                            event_info = cls._extract_event_info(cell)
                            
                            # Si l'événement n'est pas vide, le comptabiliser
                            if not event_info['is_empty'] or event_info['is_weekend']:
                                debug_info['events_found'] += 1
                            
                            # Stocker l'événement
                            if day_key not in events_data['users'][user_name]['days']:
                                events_data['users'][user_name]['days'][day_key] = {}
                            
                            events_data['users'][user_name]['days'][day_key][time_slot] = event_info
            
            # Calculer les statistiques globales
            events_data['summary'] = cls._calculate_events_summary(events_data['users'])
            
            # Ajouter les informations de débogage
            events_data['debug'] = debug_info
            
        except Exception as e:
            import traceback
            events_data['error'] = str(e)
            events_data['traceback'] = traceback.format_exc()
            events_data['debug'] = debug_info
        
        return events_data
    
    @staticmethod
    def _extract_day_from_cell(cell, day_index=None):
        """
        Extrait le numéro du jour à partir d'une cellule d'événement
        
        Args:
            cell (Tag): Cellule HTML contenant l'événement
            day_index (int): Indice du jour, utilisé comme fallback
            
        Returns:
            int|str: Numéro du jour (ou chaîne de caractères)
        """
        # 1. Essayer d'extraire à partir de l'ID de la cellule
        cell_id = cell.get('id', '')
        if cell_id:
            # Plusieurs formats possibles: 'jour_X', 'j_X', etc.
            id_patterns = [r'jour_(\d+)', r'j_(\d+)', r'day_(\d+)', r'td_(\d+)', r'cell_(\d+)']
            for pattern in id_patterns:
                match = re.search(pattern, cell_id)
                if match:
                    try:
                        return int(match.group(1))
                    except (ValueError, IndexError):
                        pass
        
        # 2. Essayer d'extraire à partir des classes
        for cls in cell.get('class', []):
            # Si la classe est un nombre, c'est probablement le jour
            if cls.isdigit():
                return int(cls)
            # Ou si la classe contient "jour_X", "day_X", etc.
            patterns = [r'jour_(\d+)', r'day_(\d+)', r'j(\d+)', r'd(\d+)']
            for pattern in patterns:
                match = re.search(pattern, cls)
                if match:
                    try:
                        return int(match.group(1))
                    except (ValueError, IndexError):
                        pass
        
        # 3. Essayer d'extraire à partir des attributs data-*
        for attr_name, attr_value in cell.attrs.items():
            if attr_name.startswith('data-') and 'day' in attr_name.lower() and attr_value.isdigit():
                return int(attr_value)
            if attr_name.startswith('data-') and 'jour' in attr_name.lower() and attr_value.isdigit():
                return int(attr_value)
        
        # 4. Essayer d'extraire à partir du lien à l'intérieur
        a_elem = cell.find('a')
        if a_elem:
            # Extraire le jour du paramètre dans l'attribut href
            href = a_elem.get('href', '')
            day_patterns = [r'jour=(\d+)', r'day=(\d+)', r'j=(\d+)', r'd=(\d+)']
            for pattern in day_patterns:
                match = re.search(pattern, href)
                if match:
                    try:
                        return int(match.group(1))
                    except (ValueError, IndexError):
                        pass
            
            # Essayer d'extraire depuis la classe ou l'ID du lien
            for cls in a_elem.get('class', []):
                if cls.isdigit():
                    return int(cls)
            
            a_id = a_elem.get('id', '')
            if a_id and a_id.isdigit():
                return int(a_id)
        
        # 5. Chercher un élément avec une classe ou un id contenant le jour
        day_elements = cell.select('[class*="day"], [id*="day"], [class*="jour"], [id*="jour"]')
        for elem in day_elements:
            # Vérifier le texte de l'élément
            day_text = elem.get_text(strip=True)
            if day_text.isdigit():
                return int(day_text)
        
        # 6. En dernier recours, chercher un texte numérique dans la cellule
        # qui pourrait représenter le jour
        cell_text = cell.get_text(strip=True)
        digits = re.findall(r'\b(\d{1,2})\b', cell_text)
        if digits and 1 <= int(digits[0]) <= 31:  # Un jour du mois valide
            return int(digits[0])
        
        # 7. Si tout échoue, utiliser l'indice comme dernier recours
        if day_index is not None:
            return day_index
        
        # 8. Si vraiment rien ne marche, retourner une chaîne plutôt que None
        # pour éviter de sauter cet événement
        return f"day_{id(cell)}"  # Utiliser l'ID mémoire de la cellule pour un identifiant unique
    
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
        
        # Vérifier s'il s'agit d'un weekend (classes contenant WE ou weekend)
        for cls in cell.get('class', []):
            if 'we' in cls.lower() or 'weekend' in cls.lower():
                event_info['is_weekend'] = True
                event_info['type'] = 'weekend'
                # On continue quand même pour extraire d'éventuels contenus
                break
        
        # Extraire le contenu principal de l'événement - plus souple
        # 1. Essayer d'abord avec un div class="href"
        href_div = cell.find('div', class_='href')
        if href_div:
            content = href_div.get_text(strip=True)
            if content:
                event_info['content'] = content
                event_info['is_empty'] = False
        
        # 2. Si rien n'est trouvé, chercher dans n'importe quel div
        if not event_info['content']:
            for div in cell.find_all('div'):
                content = div.get_text(strip=True)
                if content and not event_info['content']:
                    event_info['content'] = content
                    event_info['is_empty'] = False
        
        # 3. En dernier recours, prendre tout le texte de la cellule
        if not event_info['content']:
            content = cell.get_text(strip=True)
            if content:
                event_info['content'] = content
                event_info['is_empty'] = False
        
        # Extraire le commentaire éventuel - plus souple
        # 1. Chercher dans un span avec 'arrondi'
        comment_span = cell.find('span', class_=lambda c: c and 'arrondi' in c.split())
        if comment_span:
            comment = comment_span.get_text(strip=True)
            if comment:
                event_info['comment'] = comment
                event_info['is_empty'] = False
        
        # 2. Si rien n'est trouvé, chercher dans n'importe quel span
        if not event_info['comment']:
            for span in cell.find_all('span'):
                # Éviter de prendre le span qui contient les infos de modification
                if 'background: blue' not in span.get('style', ''):
                    comment = span.get_text(strip=True)
                    if comment and not event_info['comment']:
                        event_info['comment'] = comment
                        event_info['is_empty'] = False
        
        # Extraire l'auteur et la date de dernière modification
        # Recherche plus souple ici aussi
        modified_elements = [
            cell.find('p', style=lambda s: s and 'background: blue' in s),
            cell.find('span', style=lambda s: s and 'background: blue' in s),
            cell.find('div', style=lambda s: s and 'background: blue' in s)
        ]
        
        for modified_elem in modified_elements:
            if modified_elem:
                modified_text = modified_elem.get_text(strip=True)
                # Format: "26/03/2025 - 08:43 (Benjamin SEBILE)"
                match = re.match(r'(\d{2}/\d{2}/\d{4} - \d{2}:\d{2}) \((.*?)\)', modified_text)
                if match:
                    event_info['last_modified'] = match.group(1)
                    event_info['author'] = match.group(2)
                    break
        
        # Extraire la couleur/type de l'événement
        # Liste étendue de classes de couleur possibles
        color_classes = [
            'greenyellow', 'b_greenyellow',       # Télétravail
            'maroon', 'b_maroon',                 # Réunion
            'redyellow',                          # RTE
            'tomato', 'b_tomato',                 # Congés
            'gold', 'b_gold',                     # Permanence
            'orange', 'b_orange',                 # Permanence matin
            'teal', 'b_teal',                     # Garde sur site
            'blackwhite', 'b_blackwhite',         # Congés posés
            'limegreen', 'b_limegreen',           # Jour férié
            'blue', 'b_blue', 'lightblue',        # Autres types possibles
            'red', 'b_red',
            'green', 'b_green',
            'yellow', 'b_yellow',
            'purple', 'b_purple',
            'pink', 'b_pink'
        ]
        
        # Chercher dans toutes les classes de l'élément et des éléments enfants
        all_elements = [cell] + cell.find_all()
        for element in all_elements:
            for cls in element.get('class', []):
                if cls in color_classes:
                    event_info['color'] = cls
                    break
            if event_info['color']:
                break
        
        # Si pas de couleur trouvée mais style directement dans l'attribut style
        if not event_info['color']:
            for element in all_elements:
                style = element.get('style', '')
                if 'background' in style and ':' in style:
                    bg_color = style.split('background')[1].split(':')[1].strip().split(';')[0]
                    event_info['color'] = f"style_{bg_color.replace(' ', '_')}"
        
        # Déterminer le type d'événement - logique plus souple
        content = event_info['content'] or ''
        
        # Extraire l'initiale dans le cas où le contenu est plus long
        initial = content[0].upper() if content else ''
        
        # Logique de détection améliorée
        if ('TL' in content or 'teletravail' in content.lower() or 'télétravail' in content.lower()) and not event_info['type']:
            event_info['type'] = 'telework'
        elif (initial == 'R' or 'reunion' in content.lower() or 'réunion' in content.lower()) and not event_info['type']:
            event_info['type'] = 'meeting'
        elif 'RTE' in content and not event_info['type']:
            event_info['type'] = 'rte'
        elif (initial == 'C' or 'conge' in content.lower() or 'congé' in content.lower()) and not event_info['type']:
            event_info['type'] = 'vacation'
        elif (initial == 'P' or 'permanence' in content.lower()) and not event_info['type']:
            event_info['type'] = 'duty'
        elif ('Pm' in content or 'permanence matin' in content.lower()) and not event_info['type']:
            event_info['type'] = 'morning_duty'
        elif ('GS' in content or 'garde' in content.lower() or 'site' in content.lower()) and not event_info['type']:
            event_info['type'] = 'onsite'
        elif ('CP' in content or 'conge pose' in content.lower() or 'congé posé' in content.lower()) and not event_info['type']:
            event_info['type'] = 'leave'
        elif (('JF' in content or 'jour ferie' in content.lower() or 'férié' in content.lower()) or 
              (not content and event_info['color'] in ['b_greenyellow', 'limegreen', 'b_limegreen'])) and not event_info['type']:
            event_info['type'] = 'holiday'
        elif event_info['is_weekend'] and not event_info['type']:
            event_info['type'] = 'weekend'
        elif event_info['is_empty'] and not event_info['type']:
            event_info['type'] = 'empty'
        elif not event_info['type']:
            # Si aucun type n'a été déterminé mais que la cellule n'est pas vide
            if not event_info['is_empty']:
                event_info['type'] = 'other'
            else:
                event_info['type'] = 'unknown'
        
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
            'users_count': len(users_data),
            'days_count': 0,
            'time_slots': {}
        }
        
        # Ensemble pour garder trace de tous les jours rencontrés
        all_days = set()
        
        # Parcourir tous les utilisateurs et leurs événements
        for user, user_data in users_data.items():
            user_events_count = 0
            
            for day, day_data in user_data.get('days', {}).items():
                all_days.add(day)  # Ajouter ce jour à l'ensemble des jours
                
                for time_slot, event_info in day_data.items():
                    # Comptabiliser les créneaux horaires
                    if time_slot not in summary['time_slots']:
                        summary['time_slots'][time_slot] = 0
                    
                    # Considérer un événement comme non vide selon les critères suivants
                    is_countable = (
                        (not event_info.get('is_empty', True)) or  # Contenu non vide
                        event_info.get('is_weekend', False) or      # C'est un weekend
                        event_info.get('type') not in [None, 'empty', 'unknown']  # Type défini
                    )
                    
                    if is_countable:
                        summary['total_events'] += 1
                        user_events_count += 1
                        summary['time_slots'][time_slot] += 1
                        
                        # Comptabiliser par type d'événement
                        event_type = event_info.get('type', 'unknown')
                        if event_type not in summary['events_by_type']:
                            summary['events_by_type'][event_type] = 0
                        summary['events_by_type'][event_type] += 1
        
        # Nombre total de jours rencontrés
        summary['days_count'] = len(all_days)
        
        return summary