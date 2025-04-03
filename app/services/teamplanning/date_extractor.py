# app/services/teamplanning/date_extractor.py
"""
Module pour extraire les informations de date du planning Netplanning
"""

from datetime import datetime
import re
from app.services.teamplanning.extractor_base import ExtractorBase

class DateExtractor(ExtractorBase):
    """
    Classe pour extraire les informations de dates du planning
    """
    
    @classmethod
    def extract_planning_dates(cls, html_content):
        """
        Extrait les dates du planning depuis le HTML
        
        Args:
            html_content (str): Contenu HTML brut
            
        Returns:
            dict: Informations sur les dates (mois, année, jours)
        """
        soup = cls.create_soup(html_content)
        
        # Informations à extraire
        dates_info = {
            'month': None,
            'year': None,
            'days': [],
            'weekdays': []
        }
        
        try:
            # Trouver le tableau principal
            table, thead, _ = cls.find_table_and_sections(soup)
            if not table or not thead:
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
            dates_info['verification'] = cls._verify_date_consistency(
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
                'lun': 0, 'mar': 1, 'mer': 2, 'jeu': 3, 'ven': 4, 'sam': 5, 'dim': 6,
                'lu': 0, 'ma': 1, 'me': 2, 'je': 3, 've': 4, 'sa': 5, 'di': 6,
                'l': 0, 'm': 1, 'me': 2, 'j': 3, 'v': 4, 's': 5, 'd': 6
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