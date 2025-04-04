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
    def extract_specific_days(cls, html_content, days_to_extract=None, user_index=0):
        """
        Extrait des jours spécifiques pour un utilisateur donné
        
        Args:
            html_content (str): Contenu HTML brut
            days_to_extract (list): Liste des jours à extraire, ou None pour tous
            user_index (int): Indice de l'utilisateur à extraire
            
        Returns:
            dict: Informations sur les événements
        """
        soup = cls.create_soup(html_content)
        
        # Structure pour stocker les résultats
        events_data = {
            'users': {},  # Dictionnaire où les clés sont les noms d'utilisateurs
            'summary': {}  # Statistiques globales
        }
        
        try:
            # Extraire d'abord tous les utilisateurs
            all_users = UserExtractor.extract_users(html_content)
            if not all_users or user_index >= len(all_users):
                events_data['error'] = f"Utilisateur à l'indice {user_index} non trouvé"
                return events_data
            
            # Utilisateur cible
            user_name = all_users[user_index]
            
            # Initialiser les données pour cet utilisateur
            events_data['users'][user_name] = {
                'days': {}  # Dictionnaire où les clés sont les numéros de jours
            }
            
            # Trouver tous les tbodies avec la classe "bress"
            tbodies = soup.find_all('tbody', class_='bress')
            
            if not tbodies or len(tbodies) <= user_index:
                events_data['error'] = f"Tbody pour l'utilisateur {user_name} non trouvé"
                return events_data
            
            # Obtenir le tbody de l'utilisateur demandé - chaque tbody contient un utilisateur
            user_tbody = tbodies[user_index]
            
            # Trouver toutes les lignes dans ce tbody - chaque utilisateur a 3 lignes (matin, jour, soir)
            user_rows = user_tbody.find_all('tr')
            
            if len(user_rows) < 3:
                events_data['error'] = f"Structure attendue de 3 lignes non trouvée pour {user_name}, seulement {len(user_rows)} trouvées"
                return events_data
            
            # Jours à extraire
            if days_to_extract is None:
                days_to_extract = list(range(1, 32))  # Par défaut, tous les jours de 1 à 31
            
            # Définir les noms des créneaux horaires
            time_slots = ['morning', 'day', 'evening']
            
            # Pour chaque créneau horaire (matin, jour, soir)
            for slot_idx, row in enumerate(user_rows):
                time_slot = time_slots[slot_idx]
                
                # Obtenir toutes les cellules de cette ligne
                cells = row.find_all('td')
                
                # Déterminer le décalage de début - important car les lignes 2 et 3 n'ont pas les premières cellules
                # (elles sont partagées avec la ligne 1 via rowspan)
                offset = 0
                if slot_idx == 0:  # Première rangée (matin)
                    # Chercher les cellules avec rowspan="3"
                    for i, cell in enumerate(cells):
                        if cell.get('rowspan') == '3':
                            offset += 1
                        else:
                            break
                else:
                    # Pour les rangées jour/soir, on ignore les cellules qui ont été "rowspan" 
                    # à partir de la première rangée (généralement 2 cellules)
                    offset = 0  # Pas besoin de compter, ces cellules n'existent pas dans ces rangées
                
                # Pour chaque jour à extraire
                for day in days_to_extract:
                    for j, cell in enumerate(cells[offset:], start=1):
                        # Extraire le jour de cette cellule
                        cell_day = cls._extract_day_from_cell(cell, j)
                        
                        # Si cette cellule correspond au jour recherché
                        if cell_day == day or str(cell_day) == str(day):
                            # Extraire les informations
                            event_info = cls._extract_event_info(cell)
                            
                            # Stocker l'événement
                            day_str = str(day)
                            if day_str not in events_data['users'][user_name]['days']:
                                events_data['users'][user_name]['days'][day_str] = {}
                            
                            events_data['users'][user_name]['days'][day_str][time_slot] = event_info
            
            # Calculer des statistiques
            events_count = 0
            events_by_type = {}
            
            for day_data in events_data['users'][user_name]['days'].values():
                for time_slot, event in day_data.items():
                    if not event.get('is_empty', True):
                        events_count += 1
                        event_type = event.get('type', 'unknown')
                        events_by_type[event_type] = events_by_type.get(event_type, 0) + 1
            
            events_data['summary'] = {
                'users_count': 1,
                'total_events': events_count,
                'events_by_type': events_by_type,
                'days_count': len(events_data['users'][user_name]['days'])
            }
            
        except Exception as e:
            import traceback
            events_data['error'] = str(e)
            events_data['traceback'] = traceback.format_exc()
        
        return events_data

    @classmethod
    def extract_planning_events(cls, html_content, limit_to_first_user=True, extract_first_line_only=True):
        """
        Extrait les événements du planning HTML pour tous les utilisateurs
        
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
            # Extraire d'abord la liste complète des utilisateurs
            all_users = UserExtractor.extract_users(html_content)
            
            # Limiter aux utilisateurs qu'on va traiter
            target_users = all_users[:1] if limit_to_first_user else all_users
            
            # Pour chaque utilisateur cible
            for user_idx, user_name in enumerate(target_users):
                # Extraire les événements spécifiques à cet utilisateur
                user_data = cls.extract_specific_days(
                    html_content, 
                    days_to_extract=None,  # Tous les jours
                    user_index=user_idx
                )
                
                # Si des erreurs, les reporter
                if 'error' in user_data:
                    events_data['error'] = user_data['error']
                    continue
                    
                # Si réussite, copier les données de cet utilisateur
                if user_name in user_data['users']:
                    events_data['users'][user_name] = user_data['users'][user_name]
                    
                    # Si extract_first_line_only est True, garder seulement les événements du matin
                    if extract_first_line_only:
                        for day_key, day_data in events_data['users'][user_name]['days'].items():
                            keys_to_remove = [k for k in day_data.keys() if k != 'morning']
                            for k in keys_to_remove:
                                day_data.pop(k, None)
            
            # Calculer les statistiques globales
            events_data['summary'] = cls._calculate_events_summary(events_data['users'])
                
        except Exception as e:
            import traceback
            events_data['error'] = str(e)
            events_data['traceback'] = traceback.format_exc()
        
        return events_data

    @classmethod
    def debug_cell(cls, cell, day_index=None):
        """
        Fonction de débogage pour analyser une cellule en détail
        
        Args:
            cell (Tag): Cellule HTML à analyser
            day_index (int): Indice du jour pour référence
            
        Returns:
            dict: Informations détaillées sur la cellule
        """
        debug_info = {
            'classes': cell.get('class', []),
            'has_a_tag': cell.find('a') is not None,
            'has_href_div': cell.select_one('a div.href') is not None,
            'href_div_text': cell.select_one('a div.href').get_text(strip=True) if cell.select_one('a div.href') else None,
            'has_mod_p': cell.find('p', style=lambda s: s and 'background: blue' in s) is not None,
            'mod_p_text': cell.find('p', style=lambda s: s and 'background: blue' in s).get_text(strip=True) if cell.find('p', style=lambda s: s and 'background: blue' in s) else None,
            'has_comment_span': cell.find('span', attrs={'class': lambda c: c and 'arrondi' in (c.split() if c else [])}) is not None,
            'comment_span_text': cell.find('span', attrs={'class': lambda c: c and 'arrondi' in (c.split() if c else [])}).get_text(strip=True) if cell.find('span', attrs={'class': lambda c: c and 'arrondi' in (c.split() if c else [])}) else None,
            'all_spans': [{'class': span.get('class', []), 'text': span.get_text(strip=True)} for span in cell.find_all('span')],
            'all_divs': [{'class': div.get('class', []), 'text': div.get_text(strip=True)} for div in cell.find_all('div')],
            'all_text': cell.get_text(strip=True),
            'is_weekend': 'WE' in cell.get('class', []) or any('weekend' in cls.lower() for cls in cell.get('class', [])),
            'day': cls._extract_day_from_cell(cell, day_index),
            'event_info': cls._extract_event_info(cell)
        }
        
        return debug_info

    @classmethod
    def debug_day(cls, html_content, day_to_debug, user_index=0):
        """
        Fonction de débogage pour analyser un jour spécifique
        
        Args:
            html_content (str): Contenu HTML brut
            day_to_debug (int): Jour à déboguer
            user_index (int): Indice de l'utilisateur (0 par défaut)
            
        Returns:
            dict: Informations détaillées sur le jour
        """
        soup = cls.create_soup(html_content)
        debug_info = {'day': day_to_debug, 'cells_found': 0, 'cell_details': []}
        
        try:
            # Trouver la table principale
            main_table = soup.find('table', id='tableau')
            if not main_table:
                tables = soup.find_all('table')
                if tables:
                    main_table = max(tables, key=lambda t: len(t.find_all('tr')), default=None)
            
            if not main_table:
                debug_info['error'] = "Aucune table principale trouvée"
                return debug_info
            
            # Trouver les cellules correspondant au jour spécifié
            cells = []
            
            # Chercher par id et class
            cells_by_id = main_table.find_all('a', id=str(day_to_debug))
            for a_tag in cells_by_id:
                cell = a_tag.parent  # La cellule td qui contient l'élément a
                if cell and cell.name == 'td':
                    cells.append(cell)
            
            # Chercher par classe
            cells_by_class = main_table.find_all('td', class_=lambda c: str(day_to_debug) in c.split() if c else False)
            for cell in cells_by_class:
                if cell not in cells:
                    cells.append(cell)
            
            # Prendre l'utilisateur spécifié
            if cells and len(cells) > user_index * 3:  # Multiplier par 3 pour les 3 créneaux horaires
                debug_info['cells_found'] = len(cells)
                
                # Analyser les cellules pour l'utilisateur spécifié
                for i in range(3):  # Matin, jour, soir
                    idx = user_index * 3 + i
                    if idx < len(cells):
                        cell = cells[idx]
                        time_slot = ['morning', 'day', 'evening'][i]
                        cell_debug = cls.debug_cell(cell, day_to_debug)
                        cell_debug['time_slot'] = time_slot
                        debug_info['cell_details'].append(cell_debug)
            else:
                debug_info['error'] = f"Pas assez de cellules trouvées pour l'utilisateur {user_index}"
        
        except Exception as e:
            debug_info['error'] = str(e)
        
        return debug_info
    
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
        # Fonction helper pour valider un jour - accepte tous les jours de 1 à 31
        def is_valid_day(day):
            try:
                return isinstance(day, int) and 1 <= day <= 31
            except (TypeError, ValueError):
                return False
        
        # 1. Essayer d'extraire à partir des attributs <a id="X"> ou <a class="X">
        a_tag = cell.find('a')
        if a_tag:
            # Essayer l'ID d'abord
            a_id = a_tag.get('id')
            if a_id and a_id.isdigit():
                day = int(a_id)
                if is_valid_day(day):
                    return day
            
            # Essayer les classes
            a_classes = a_tag.get('class', [])
            for cls in a_classes:
                if cls.isdigit():
                    day = int(cls)
                    if is_valid_day(day):
                        return day
            
            # Essayer d'extraire depuis l'attribut href
            href = a_tag.get('href', '')
            if 'jour=' in href:
                import re
                match = re.search(r'jour=(\d+)', href)
                if match:
                    day = int(match.group(1))
                    if is_valid_day(day):
                        return day
        
        # 2. Essayer d'extraire à partir des classes de la cellule
        for cls in cell.get('class', []):
            if cls.isdigit():
                day = int(cls)
                if is_valid_day(day):
                    return day
        
        # 3. Si tout échoue, utiliser l'indice fourni
        if day_index is not None:
            if is_valid_day(day_index):
                return day_index
            else:
                # Fallback vers un jour valide (le premier)
                return 1
        
        # Si vraiment rien ne marche, retourner une chaîne avec l'identifiant unique
        return f"day_unknown_{id(cell)}"

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
            'is_weekend': False,    # Indique si c'est un weekend
            'is_holiday': False     # Indique si c'est un jour férié
        }
        
        # Vérifier s'il s'agit d'un weekend (exactement la classe "WE")
        if 'WE' in cell.get('class', []):
            event_info['is_weekend'] = True
            event_info['type'] = 'weekend'
            # Le type est déjà défini, mais on continue pour extraire d'autres infos
        
        # Extraire les informations de modification (date, auteur)
        mod_p = cell.find('p', style=lambda s: s and 'background: blue' in s)
        if mod_p:
            mod_text = mod_p.get_text(strip=True)
            match = re.match(r'(\d{2}/\d{2}/\d{4} - \d{2}:\d{2}) \((.*?)\)', mod_text)
            if match:
                event_info['last_modified'] = match.group(1)
                event_info['author'] = match.group(2)
        
        # Extraire le commentaire - chercher dans <noclick><span>
        noclick = cell.find('noclick')
        if noclick:
            span = noclick.find('span')
            if span:
                comment_text = span.get_text(strip=True)
                if comment_text:
                    event_info['comment'] = comment_text
                    event_info['is_empty'] = False
        
        # Si pas trouvé dans noclick, chercher dans tous les spans avec class arrondi
        if not event_info['comment']:
            spans = cell.find_all('span', class_='arrondi')
            for span in spans:
                comment_text = span.get_text(strip=True)
                if comment_text:
                    event_info['comment'] = comment_text
                    event_info['is_empty'] = False
                    break
        
        # Extraire le contenu principal (div avec classe href dans un lien a)
        href_div = cell.select_one('a div.href')
        if href_div:
            # Méthode 1: Obtenir le texte directement
            content = href_div.get_text(strip=True)
            # Ignorer les éléments du menu contextuel
            if content and content not in ['Couper', 'Copier', 'Coller', 'Annuler', 'La cible sera ecrasée']:
                event_info['content'] = content
                event_info['is_empty'] = False
        
        # Extraire la couleur/type à partir des classes de cellules
        color_map = {
            'greenyellow': 'telework',       # Télétravail
            'b_greenyellow': 'holiday',      # Jour férié
            'maroon': 'meeting',             # Réunion
            'b_maroon': 'meeting',           # Réunion  
            'redyellow': 'rte',              # RTE
            'tomato': 'vacation',            # Congés
            'b_tomato': 'vacation',          # Congés
            'gold': 'duty',                  # Permanence
            'b_gold': 'duty',                # Permanence
            'orange': 'preventive_meditech', # Préventive Meditech
            'b_orange': 'preventive_meditech', # Préventive Meditech
            'teal': 'onsite',                # Garde sur site
            'b_teal': 'onsite',              # Garde sur site
            'blackwhite': 'leave',           # Congés posés
            'b_blackwhite': 'leave',         # Congés posés
            'limegreen': 'holiday',          # Jour férié
            'b_limegreen': 'holiday',        # Jour férié
        }
        
        # Vérifier dans les classes de la cellule
        for cls in cell.get('class', []):
            if cls in color_map and not event_info['type']:  # Ne pas écraser weekend
                event_info['color'] = cls
                event_info['type'] = color_map[cls]
                event_info['is_empty'] = False
                
                # Marquer les jours fériés
                if color_map[cls] == 'holiday':
                    event_info['is_holiday'] = True
        
        # Déterminer le type d'événement à partir du contenu si pas déjà défini
        if not event_info['type'] and event_info['content']:
            content = event_info['content']
            
            # Tous les types d'événements demandés
            event_types = {
                'TL': 'tele_maintenance',      # Télémaintenance
                'TLT': 'telework',             # Télétravail
                'P': 'preventive',             # Préventive
                'Pf': 'preventive_fixed',      # Préventive fixée
                'Pm': 'preventive_meditech',   # Préventive Meditech
                'Pmf': 'preventive_meditech_fixed', # Préventive Meditech fixée
                'C': 'corrective',             # Corrective
                'Cf': 'corrective_fixed',      # Corrective fixée
                'R': 'meeting',                # Réunion
                'RTE': 'route',                # Route
                'CP': 'paid_leave',            # Congés Payés
                'CP2': 'half_paid_leave',      # Demi congés payés
                'RTT': 'rtt',                  # RTT
                'RT2': 'half_rtt',             # Demi RTT
                'Rec': 'compensatory',         # Récup
                'RC': 'compensatory_rest',     # Repos Compensateur
                'CS': 'special_leave',         # Congés Spéciaux
                'GS': 'stock_management',      # Gestion de Stock
                'MES': 'commissioning',        # Mise en service
                'I': 'installation',           # Installation
                'FOR': 'training',             # Formation
                'BUR': 'office',               # Bureau
                'FT': 'tech_training',         # Formation Tech
                'DM': 'dismantling',           # Démontage
                'JF': 'holiday'                # Jour férié
            }
            
            if content in event_types:
                event_info['type'] = event_types[content]
                
                # Marquer les jours fériés
                if event_info['type'] == 'holiday':
                    event_info['is_holiday'] = True
            else:
                event_info['type'] = 'other'
        
        # Si on a un commentaire mais pas de type, mettre "comment"
        if not event_info['type'] and event_info['comment']:
            event_info['type'] = 'comment'
        
        # Si la cellule est vide mais que c'est un week-end, ne pas marquer comme empty
        if event_info['is_empty'] and event_info['is_weekend']:
            event_info['is_empty'] = False
        
        # Si la cellule est toujours vide (pas de contenu, ni commentaire, ni type), marquer comme empty
        if event_info['is_empty'] and not event_info['type']:
            event_info['type'] = 'empty'
        
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