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
                        raw_text = p_rouge_element.get_text(strip=True)
                        
                        # Rechercher si le nom est dans un élément <b>
                        b_element = p_rouge_element.find('b')
                        if b_element:
                            lastname = b_element.get_text(strip=True)
                            # Extraire le prénom en supprimant le nom du texte complet
                            firstname = raw_text.replace(lastname, '').strip()
                            full_name = f"{lastname} {firstname}".strip()
                        else:
                            # Si pas d'élément <b>, essayer de séparer par les espaces
                            parts = raw_text.split()
                            if len(parts) >= 2:
                                # Supposer que le premier élément est le nom et le reste est le prénom
                                lastname = parts[0]
                                firstname = ' '.join(parts[1:])
                                full_name = f"{lastname} {firstname}"
                            else:
                                full_name = raw_text
                
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
            'days': [],
            'weekdays': []
        }
        
        try:
            # Trouver le tableau principal
            table = soup.find('table', id='tableau')
            if not table:
                return dates_info
                
            # Trouver le thead qui contient les en-têtes
            thead = table.find('thead')
            if not thead:
                return dates_info
                
            # Trouver le premier tr dans thead
            first_tr = thead.find('tr')
            if not first_tr:
                return dates_info
                
            # Trouver le premier td qui contient le mois et l'année
            first_td = first_tr.find('td')
            if not first_td:
                return dates_info
                
            # Extraire le mois (dans la div avec class qui contient "bigtext")
            month_div = first_td.find('div', class_=lambda x: x and 'bigtext' in x.split())
            if month_div:
                dates_info['month'] = month_div.get_text(strip=True)
                
            # Extraire l'année (dans la div avec class qui contient "noir")
            year_div = first_td.find('div', class_=lambda x: x and 'noir' in x.split())
            if year_div:
                try:
                    year_text = year_div.get_text(strip=True)
                    dates_info['year'] = int(year_text)
                except ValueError:
                    # Si la conversion en int échoue, garder la valeur sous forme de texte
                    dates_info['year'] = year_text
            
            # Trouver le troisième tr dans thead (qui contient les jours)
            trs = thead.find_all('tr')
            if len(trs) >= 3:
                days_tr = trs[2]  # Le troisième tr (index 2)
                
                # Trouver tous les td avec id commençant par "tj"
                day_cells = days_tr.find_all('td', id=lambda x: x and x.startswith('tj'))
                
                for cell in day_cells:
                    # Extraire le numéro du jour du mois
                    jhref_div = cell.find('div', class_='jhref')
                    if jhref_div:
                        # Le texte contient typiquement la forme "Lun\n1" - on extrait le jour et le nombre
                        day_text = jhref_div.get_text(strip=True)
                        
                        # Extraire le jour de la semaine (3 premières lettres)
                        weekday_div = jhref_div.find('div')
                        weekday = weekday_div.get_text(strip=True) if weekday_div else None
                        
                        # Extraire le numéro du jour
                        day_number = None
                        # Méthode 1: essayer d'extraire d'après les retours à la ligne
                        if '\n' in day_text:
                            parts = day_text.split('\n')
                            for part in parts:
                                if part.strip().isdigit():
                                    day_number = int(part.strip())
                                    break
                        
                        # Méthode 2: si pas trouvé, chercher tous les chiffres dans le texte
                        if day_number is None:
                            import re
                            digits = re.findall(r'\d+', day_text)
                            if digits:
                                day_number = int(digits[0])
                        
                        # Si on a trouvé un jour et un jour de semaine, les ajouter
                        if day_number:
                            dates_info['days'].append(day_number)
                            # S'assurer que weekday est non None avant de l'ajouter
                            if weekday is not None:
                                dates_info['weekdays'].append({'day': day_number, 'weekday': weekday})
                            # Si on n'a pas trouvé de jour de semaine mais qu'on a le jour du mois
                            elif day_number == 1 and len(dates_info['weekdays']) == 0:
                                # Comme c'est le premier jour, on essaie de déduire le jour de semaine
                                # depuis le contenu HTML brut
                                first_day_td = soup.find('td', id='tj1')
                                if first_day_td:
                                    # Chercher directement dans le premier td le jour de semaine
                                    weekday_text = None
                                    day_div = first_day_td.find('div', class_='jhref')
                                    if day_div and day_div.find('div'):
                                        weekday_text = day_div.find('div').get_text(strip=True)
                                    
                                    if weekday_text:
                                        dates_info['weekdays'].append({'day': 1, 'weekday': weekday_text})

            # Trier les jours par ordre croissant
            dates_info['days'].sort()
            dates_info['weekdays'].sort(key=lambda x: x['day'])
            
            # Vérification de cohérence
            dates_info['verification'] = NetplanningExtractor._verify_date_consistency(
                dates_info['year'], 
                dates_info['month'], 
                dates_info['weekdays']
            )
                
        except Exception as e:
            # En cas d'erreur, ajouter une information sur l'erreur
            dates_info['error'] = str(e)
        
        return dates_info
    
    @staticmethod
    def _verify_date_consistency(year, month, weekdays):
        """
        Vérifie la cohérence des dates extraites
        
        Args:
            year: Année extraite
            month: Mois extrait
            weekdays: Liste des jours de la semaine extraits
            
        Returns:
            dict: Résultat de la vérification
        """
        from datetime import datetime
        
        result = {
            'is_consistent': False,
            'message': ''
        }
        
        # Vérifier que toutes les données nécessaires sont présentes
        if not year:
            result['message'] = "Année non trouvée dans le document HTML"
            return result
        if not month:
            result['message'] = "Mois non trouvé dans le document HTML"
            return result
        if not weekdays or len(weekdays) == 0:
            result['message'] = "Jours de la semaine non trouvés dans le document HTML"
            return result
            
        try:
            # Conversion du mois en numéro
            month_names_fr = {
                'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6,
                'juillet': 7, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
            }
            
            month_number = None
            month_lower = month.lower()
            
            for name, num in month_names_fr.items():
                if month_lower == name:
                    month_number = num
                    break
            
            if not month_number:
                result['message'] = f"Impossible de convertir le mois '{month}' en numéro"
                return result
                
            # Correspondance entre les abréviations des jours et les numéros (0=lundi, 6=dimanche)
            weekday_map = {
                'lun': 0, 'mar': 1, 'mer': 2, 'jeu': 3, 'ven': 4, 'sam': 5, 'dim': 6
            }
            
            # Vérifier le premier jour du mois
            first_day = next((wd for wd in weekdays if wd['day'] == 1), None)
            
            if first_day:
                weekday_abbr = first_day['weekday'].lower()
                if weekday_abbr in weekday_map:
                    expected_weekday = weekday_map[weekday_abbr]
                    
                    # Créer la date du premier jour du mois
                    date = datetime(year, month_number, 1)
                    actual_weekday = date.weekday()  # 0=lundi, 6=dimanche
                    
                    if expected_weekday == actual_weekday:
                        result['is_consistent'] = True
                        result['message'] = f"Vérification réussie: le 1er {month} {year} est bien un {first_day['weekday']}"
                    else:
                        weekday_names = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
                        result['message'] = f"Incohérence: le 1er {month} {year} devrait être un {weekday_names[actual_weekday]}, mais a été détecté comme {first_day['weekday']}"
                else:
                    result['message'] = f"Jour de semaine non reconnu: {first_day['weekday']}"
            else:
                result['message'] = "Impossible de trouver le premier jour du mois"
                
        except Exception as e:
            result['message'] = f"Erreur lors de la vérification: {str(e)}"
            
        return result