# app/services/planning_parser.py
from bs4 import BeautifulSoup
import hashlib
import json
import re
from datetime import datetime, timedelta
from app.models.planning import RawPlanning, ParsedPlanning, PlanningEntry
from app.extensions import db

class PlanningParser:
    """Service pour analyser et traiter le contenu brut du planning"""
    
    @staticmethod
    def compute_content_hash(content):
        """Calcule un hash du contenu pour vérifier s'il a changé"""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    @staticmethod
    def save_raw_content(content):
        """Sauvegarde le contenu brut s'il n'existe pas déjà"""
        content_hash = PlanningParser.compute_content_hash(content)
        
        # Vérifier si ce contenu existe déjà
        existing = RawPlanning.query.filter_by(content_hash=content_hash).first()
        if existing:
            return existing, False
            
        # Créer une nouvelle entrée
        raw_planning = RawPlanning(
            content_hash=content_hash,
            raw_content=content,
            parsed=False
        )
        
        db.session.add(raw_planning)
        db.session.commit()
        
        return raw_planning, True
    
    @staticmethod
    def parse_planning(raw_planning_id):
        """Analyse le contenu brut pour extraire les données de planning"""
        raw_planning = RawPlanning.query.get(raw_planning_id)
        if not raw_planning:
            raise ValueError(f"Planning brut avec ID {raw_planning_id} non trouvé")
            
        # Si déjà analysé, retourner le planning analysé existant
        if raw_planning.parsed and hasattr(raw_planning, 'parsed_planning'):
            return raw_planning.parsed_planning
            
        # Analyser le contenu HTML
        soup = BeautifulSoup(raw_planning.raw_content, 'html.parser')
        
        # Extraire les informations du planning
        planning_data = PlanningParser._extract_planning_data(soup)
        
        # Déterminer le mois et l'année
        month, year = PlanningParser._extract_month_year(soup)
        
        # Créer un nouvel enregistrement pour le planning analysé
        parsed_planning = ParsedPlanning(
            raw_planning_id=raw_planning.id,
            month=month,
            year=year,
            planning_data=json.dumps(planning_data)
        )
        
        db.session.add(parsed_planning)
        
        # Marquer le planning brut comme analysé
        raw_planning.parsed = True
        db.session.commit()
        
        # Créer les entrées individuelles
        PlanningParser._create_planning_entries(parsed_planning.id, planning_data)
        
        return parsed_planning
    
    @staticmethod
    def _extract_month_year(soup):
        """Extrait le mois et l'année du planning"""
        # Cette logique dépendra de la structure spécifique de Netplanning
        # Exemple d'implémentation (à adapter selon la structure réelle)
        title_element = soup.find('h1') or soup.find('title')
        if title_element:
            title_text = title_element.text
            # Recherche d'un format comme "Planning - Janvier 2023"
            match = re.search(r'(\w+)\s+(\d{4})', title_text)
            if match:
                month, year = match.groups()
                return month, int(year)
        
        # Valeur par défaut si non trouvé
        current_date = datetime.now()
        return current_date.strftime('%B'), current_date.year
    
    @staticmethod
    def _extract_planning_data(soup):
        """Extrait les données du planning à partir du HTML"""
        planning_data = {
            "people": [],
            "days": [],
            "entries": {}
        }
        
        # Trouver la table de planning (ceci est un exemple et doit être adapté)
        table = soup.find('table', class_='planning')
        
        if not table:
            # Si la table spécifique n'est pas trouvée, chercher n'importe quelle table
            tables = soup.find_all('table')
            if tables:
                table = tables[0]  # Prendre la première table
        
        if not table:
            return planning_data  # Retourner des données vides si aucune table n'est trouvée
            
        # Extraire les entêtes (jours)
        headers = table.find_all('th')
        for header in headers[1:]:  # Ignorer la première colonne qui contient généralement les noms
            day_text = header.text.strip()
            if day_text and day_text.isdigit():  # Si c'est un nombre (jour du mois)
                planning_data["days"].append(int(day_text))
        
        # Extraire les noms des personnes et leurs plannings
        rows = table.find_all('tr')
        for row in rows[1:]:  # Ignorer la ligne d'en-tête
            cells = row.find_all('td')
            if not cells:
                continue
                
            person_name = cells[0].text.strip()
            if not person_name:
                continue
                
            planning_data["people"].append(person_name)
            planning_data["entries"][person_name] = {}
            
            for i, cell in enumerate(cells[1:]):
                if i >= len(planning_data["days"]):
                    break
                
                day = planning_data["days"][i]
                cell_text = cell.text.strip()
                
                # Analyser le contenu de la cellule pour déterminer matin/journée/soir
                # Cela dépendra de la façon dont les données sont présentées dans Netplanning
                morning, day_shift, evening = PlanningParser._parse_cell_content(cell)
                
                planning_data["entries"][person_name][day] = {
                    "morning": morning,
                    "day": day_shift,
                    "evening": evening
                }
        
        return planning_data
    
    @staticmethod
    def _parse_cell_content(cell):
        """Analyse le contenu d'une cellule pour extraire les informations de planning"""
        cell_text = cell.text.strip()
        
        # Valeurs par défaut
        morning = None
        day_shift = None
        evening = None
        
        # Cette logique doit être adaptée selon la façon dont les données sont présentées
        # Par exemple, si les cellules contiennent des abréviations ou des codes spécifiques
        
        # Exemple simple (à adapter)
        if 'M' in cell_text:
            morning = 'M'
        if 'J' in cell_text:
            day_shift = 'J'
        if 'S' in cell_text:
            evening = 'S'
            
        # Cas plus complexe : si la cellule contient du HTML ou des classes spécifiques
        morning_element = cell.find('div', class_='morning')
        if morning_element:
            morning = morning_element.text.strip()
            
        day_element = cell.find('div', class_='day')
        if day_element:
            day_shift = day_element.text.strip()
            
        evening_element = cell.find('div', class_='evening')
        if evening_element:
            evening = evening_element.text.strip()
        
        return morning, day_shift, evening
    
    @staticmethod
    def _create_planning_entries(parsed_planning_id, planning_data):
        """Crée des entrées individuelles dans la base de données à partir des données analysées"""
        from datetime import datetime, timedelta
        import calendar
        
        parsed_planning = ParsedPlanning.query.get(parsed_planning_id)
        if not parsed_planning:
            return
        
        # Déterminer le premier jour du mois
        try:
            month_index = {"january": 1, "février": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6,
                          "juillet": 7, "août": 8, "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12}
            
            month_name = parsed_planning.month.lower()
            month_num = month_index.get(month_name, datetime.now().month)
            year = parsed_planning.year
            
            first_day = datetime(year, month_num, 1)
            
            # Déterminer le nombre de jours dans ce mois
            _, days_in_month = calendar.monthrange(year, month_num)
        except (ValueError, KeyError):
            # En cas d'erreur, utiliser le mois courant
            now = datetime.now()
            first_day = datetime(now.year, now.month, 1)
            _, days_in_month = calendar.monthrange(now.year, now.month)
        
        # Créer les entrées pour chaque personne et chaque jour
        for person in planning_data["people"]:
            for day_num in planning_data["days"]:
                # Vérifier si le jour est valide pour ce mois
                if day_num < 1 or day_num > days_in_month:
                    print(f"Avertissement: jour {day_num} hors limites pour {month_name} {year} (max: {days_in_month})")
                    continue
                
                day_data = planning_data["entries"].get(person, {}).get(day_num, {})
                
                entry_date = first_day + timedelta(days=day_num-1)
                
                entry = PlanningEntry(
                    parsed_planning_id=parsed_planning_id,
                    person_name=person,
                    date=entry_date,
                    morning=day_data.get("morning"),
                    day=day_data.get("day"),
                    evening=day_data.get("evening")
                )
                
                db.session.add(entry)
        
        db.session.commit()