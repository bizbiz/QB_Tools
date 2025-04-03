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
        Extrait des jours spécifiques en utilisant la même méthode que debug_day
        
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
            # Trouver la table principale
            main_table = soup.find('table', id='tableau')
            if not main_table:
                tables = soup.find_all('table')
                if tables:
                    main_table = max(tables, key=lambda t: len(t.find_all('tr')), default=None)
            
            if not main_table:
                events_data['error'] = "Aucune table principale trouvée"
                return events_data
            
            # Trouver les lignes pour identifier l'utilisateur
            rows = main_table.find_all('tr')
            user_rows = []
            user_name = "Utilisateur inconnu"
            
            # Chercher toutes les cellules contenant le nom d'utilisateur
            user_cells = main_table.find_all('td', class_='nom_ress')
            
            if user_cells and user_index < len(user_cells):
                user_cell = user_cells[user_index]
                user_name = UserExtractor._extract_user_name(user_cell)
                
                # Trouver la ligne parent qui contient cette cellule
                parent_row = user_cell.parent
                if parent_row and parent_row.name == 'tr':
                    # Trouver ce parent_row dans rows
                    for i, row in enumerate(rows):
                        if row is parent_row:
                            # Ce sont les 3 lignes pour cet utilisateur (matin, journée, soir)
                            user_rows = [rows[i], rows[i+1] if i+1 < len(rows) else None, rows[i+2] if i+2 < len(rows) else None]
                            break
            
            if not user_rows or not user_rows[0]:
                events_data['error'] = f"Impossible de trouver les lignes pour l'utilisateur d'indice {user_index}"
                return events_data
            
            # Initialiser les données pour cet utilisateur
            events_data['users'][user_name] = {
                'days': {}  # Dictionnaire où les clés sont les numéros de jours
            }
            
            # Jours à extraire
            if days_to_extract is None:
                days_to_extract = list(range(1, 32))  # Par défaut, tous les jours de 1 à 31
            
            # Pour chaque jour à extraire
            for day in days_to_extract:
                # Trouver toutes les cellules pour ce jour
                day_cells = []
                
                # Méthode 1: Chercher par attribut id des liens
                for row_idx, row in enumerate(user_rows):
                    if row is None:
                        continue
                        
                    day_a_tags = row.find_all('a', id=str(day))
                    for a_tag in day_a_tags:
                        cell = a_tag.parent
                        if cell and cell.name == 'td':
                            day_cells.append((row_idx, cell))
                
                # Méthode 2: Chercher par classe des cellules
                for row_idx, row in enumerate(user_rows):
                    if row is None:
                        continue
                        
                    day_cells_class = row.find_all('td', class_=lambda c: str(day) in (c.split() if c else []))
                    for cell in day_cells_class:
                        # Vérifier si on n'a pas déjà cette cellule
                        if not any(existing_cell[1] is cell for existing_cell in day_cells):
                            day_cells.append((row_idx, cell))
                
                # Traiter chaque cellule trouvée
                for row_idx, cell in day_cells:
                    # Déterminer le créneau horaire
                    time_slot = ['morning', 'day', 'evening'][row_idx]
                    
                    # Extraire les informations de l'événement
                    event_info = cls._extract_event_info(cell)
                    
                    # Stocker l'événement
                    events_data['users'][user_name]['days'][str(day)] = events_data['users'][user_name]['days'].get(str(day), {})
                    events_data['users'][user_name]['days'][str(day)][time_slot] = event_info
            
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
                'events_count': events_count,
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
            'events_found': 0,
            'skipped_days': 0,  # Nouveau compteur pour les jours ignorés
            'processed_days': []  # Liste des jours traités pour débogage
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

                        if extract_first_line_only and time_slot != 'morning':
                            continue
                        
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
                            
                            # Enregistrer le jour pour débogage
                            debug_info['processed_days'].append(day)
                            
                            # Éviter les doublons en vérifiant si ce jour existe déjà pour cet utilisateur
                            if day_key in events_data['users'][user_name]['days'] and time_slot in events_data['users'][user_name]['days'][day_key]:
                                debug_info['skipped_days'] += 1
                                continue
                            
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
                            
                            # Enregistrer le jour pour débogage
                            debug_info['processed_days'].append(day)
                            
                            # Éviter les doublons en vérifiant si ce jour existe déjà pour cet utilisateur
                            if day_key in events_data['users'][user_name]['days'] and time_slot in events_data['users'][user_name]['days'][day_key]:
                                debug_info['skipped_days'] += 1
                                continue
                            
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
            'is_weekend': False     # Indique si c'est un weekend
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
            'orange': 'morning_duty',        # Permanence matin
            'b_orange': 'morning_duty',      # Permanence matin
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
        
        # Déterminer le type d'événement à partir du contenu si pas déjà défini
        if not event_info['type'] and event_info['content']:
            content = event_info['content']
            
            if content == 'TL':
                event_info['type'] = 'telework'
            elif content == 'R':
                event_info['type'] = 'meeting'
            elif content == 'RTE':
                event_info['type'] = 'rte'
            elif content == 'C':
                event_info['type'] = 'vacation'
            elif content == 'P':
                event_info['type'] = 'duty'
            elif content == 'Pm':
                event_info['type'] = 'morning_duty'
            elif content == 'GS':
                event_info['type'] = 'onsite'
            elif content == 'CP':
                event_info['type'] = 'leave'
            elif content == 'JF':
                event_info['type'] = 'holiday'
            else:
                event_info['type'] = 'other'
        
        # Si on a un commentaire mais pas de type, mettre "other"
        if not event_info['type'] and event_info['comment']:
            event_info['type'] = 'other'
        
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