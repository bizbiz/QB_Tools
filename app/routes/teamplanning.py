# app/routes/teamplanning.py
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from app.extensions import db
import requests
from app.services.planning_parser import PlanningParser
from app.services.teamplanning import NetplanningExtractor
from app.models.planning import RawPlanning, ParsedPlanning, PlanningEntry
from datetime import datetime, timedelta

teamplanning_bp = Blueprint('teamplanning', __name__, url_prefix='/teamplanning')

@teamplanning_bp.route('/')
def index():
    """Page principale du module Teamplanning"""
    # Récupérer le dernier planning analysé s'il existe
    latest_planning = ParsedPlanning.query.order_by(ParsedPlanning.created_at.desc()).first()
    
    return render_template('teamplanning/index.html', latest_planning=latest_planning)

@teamplanning_bp.route('/fetch-netplanning', methods=['POST'])
def fetch_netplanning():
    """Récupère le contenu de Netplanning avec le cookie fourni"""
    data = request.get_json()
    
    if not data or 'cookie' not in data:
        return jsonify({'success': False, 'error': 'Cookie non fourni'}), 400
    
    cookie = data['cookie']
    
    # Définir le cookie pour la requête sans le stocker côté serveur
    cookies = {
        'PHPSESSID': cookie  # Le nom peut varier, mais PHPSESSID est courant pour PHP
    }
    
    # Définir les headers pour simuler un navigateur
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
        'Referer': 'https://www.netplanning.fr/',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
    }
    
    try:
        # Faire la requête à Netplanning
        response = requests.get('https://www.netplanning.fr/', cookies=cookies, headers=headers, timeout=10)
        
        # Vérifier si la requête a réussi
        if response.status_code == 200:
            content = response.text
            
            # Vérifier si c'est la page de login
            if 'connexion' in content.lower() and 'mot de passe' in content.lower():
                return jsonify({
                    'success': False,
                    'error': 'Session expirée - connexion requise',
                    'requires_login': True
                })
            
            # Stocker le contenu dans la base de données s'il a changé
            raw_planning, is_new = PlanningParser.save_raw_content(content)
            
            result = {
                'success': True,
                'content': content,  # Toujours renvoyer le contenu brut pour l'affichage
                'is_new': is_new,
                'raw_planning_id': raw_planning.id
            }
            
            # Si c'est un nouveau contenu, l'analyser
            if is_new:
                try:
                    parsed_planning = PlanningParser.parse_planning(raw_planning.id)
                    result['parsed'] = True
                    result['parsed_planning_id'] = parsed_planning.id
                except Exception as e:
                    # En cas d'erreur d'analyse, on continue quand même
                    result['parsed'] = False
                    result['parse_error'] = str(e)
            else:
                # Si le contenu existe déjà, récupérer le planning analysé associé
                result['parsed'] = raw_planning.parsed
                if raw_planning.parsed and hasattr(raw_planning, 'parsed_planning'):
                    result['parsed_planning_id'] = raw_planning.parsed_planning.id
            
            return jsonify(result)
        else:
            return jsonify({
                'success': False, 
                'error': f'Erreur lors de la récupération des données (code {response.status_code})'
            }), 500
            
    except requests.exceptions.RequestException as e:
        return jsonify({'success': False, 'error': f'Erreur de connexion: {str(e)}'}), 500

@teamplanning_bp.route('/extract-users', methods=['POST'])
def extract_users():
    """Extrait les noms des utilisateurs à partir du dernier planning brut"""
    # Récupérer le dernier planning brut
    latest_raw_planning = RawPlanning.query.order_by(RawPlanning.created_at.desc()).first()
    
    if not latest_raw_planning:
        return jsonify({
            'success': False,
            'error': 'Aucun planning n\'a été récupéré. Veuillez d\'abord récupérer des données Netplanning.'
        }), 404
    
    try:
        # Utiliser notre service d'extraction HTML
        users = NetplanningExtractor.extract_users(latest_raw_planning.raw_content)
        
        return jsonify({
            'success': True,
            'users': users,
            'count': len(users)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Erreur lors de l\'extraction des utilisateurs: {str(e)}'
        }), 500

@teamplanning_bp.route('/view-planning/<int:parsed_planning_id>')
def view_planning(parsed_planning_id):
    """Affiche le planning analysé"""
    parsed_planning = ParsedPlanning.query.get_or_404(parsed_planning_id)
    
    # Récupérer toutes les entrées pour ce planning
    entries = PlanningEntry.query.filter_by(parsed_planning_id=parsed_planning_id).all()
    
    # Organiser les données pour l'affichage
    planning_data = parsed_planning.get_planning_data()
    
    return render_template(
        'teamplanning/view_planning.html',
        planning=parsed_planning,
        planning_data=planning_data,
        entries=entries
    )

@teamplanning_bp.route('/extract-dates', methods=['POST'])
def extract_dates():
    """Extrait les informations de dates (mois, année, jours) du planning"""
    # Récupérer le dernier planning brut
    latest_raw_planning = RawPlanning.query.order_by(RawPlanning.created_at.desc()).first()
    
    if not latest_raw_planning:
        return jsonify({
            'success': False,
            'error': 'Aucun planning n\'a été récupéré. Veuillez d\'abord récupérer des données Netplanning.'
        }), 404
    
    try:
        # Utiliser notre service d'extraction HTML
        dates_info = NetplanningExtractor.extract_planning_dates(latest_raw_planning.raw_content)
        
        if dates_info.get('error'):
            return jsonify({
                'success': False,
                'error': f'Erreur lors de l\'extraction des dates: {dates_info["error"]}'
            }), 500
        
        # Formater un message résumé
        summary = ""
        if dates_info['month'] and dates_info['year'] and dates_info['days']:
            first_day = min(dates_info['days'])
            last_day = max(dates_info['days'])
            
            # Trouver les jours de la semaine pour le premier et dernier jour
            first_weekday = next((wd['weekday'] for wd in dates_info['weekdays'] if wd['day'] == first_day), "")
            last_weekday = next((wd['weekday'] for wd in dates_info['weekdays'] if wd['day'] == last_day), "")
            
            # Formater les jours de la semaine avec une majuscule
            if first_weekday:
                first_weekday = first_weekday.capitalize()
            if last_weekday:
                last_weekday = last_weekday.capitalize()
            
            summary = f"{dates_info['month']} {dates_info['year']} du {first_weekday} {first_day} au {last_weekday} {last_day}"
        
        # Ajouter la vérification de cohérence
        verification = {}
        if 'verification' in dates_info:
            verification = dates_info['verification']
            
        # Ajouter des informations de débogage
        debug_info = {
            'raw_data': {
                'month': dates_info.get('month'),
                'year': dates_info.get('year'),
                'days_count': len(dates_info.get('days', [])),
                'weekdays_count': len(dates_info.get('weekdays', [])),
                'first_weekday': dates_info.get('weekdays', [{}])[0].get('weekday') if dates_info.get('weekdays') else None
            }
        }
        
        return jsonify({
            'success': True,
            'dates': dates_info,
            'summary': summary,
            'verification': verification,
            'debug': debug_info
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Erreur lors de l\'extraction des dates: {str(e)}'
        }), 500


# app/routes/teamplanning.py - Mise à jour de la route extract-events

@teamplanning_bp.route('/extract-events', methods=['POST'])
def extract_events():
    """Extrait les événements du planning pour la première ligne du premier utilisateur"""
    # Récupérer le dernier planning brut
    latest_raw_planning = RawPlanning.query.order_by(RawPlanning.created_at.desc()).first()
    
    if not latest_raw_planning:
        return jsonify({
            'success': False,
            'error': 'Aucun planning n\'a été récupéré. Veuillez d\'abord récupérer des données Netplanning.'
        }), 404
    
    try:
        # Extraire les événements
        first_user_only = request.json.get('first_user_only', True) if request.json else True
        first_line_only = request.json.get('first_line_only', True) if request.json else True
        
        events_data = NetplanningExtractor.extract_planning_events(
            latest_raw_planning.raw_content,
            limit_to_first_user=first_user_only,
            extract_first_line_only=first_line_only
        )
        
        if 'error' in events_data:
            return jsonify({
                'success': False,
                'error': f'Erreur lors de l\'extraction des événements: {events_data["error"]}'
            }), 500
        
        # Créer un résumé pour le front-end
        summary = {
            'users_count': events_data['summary'].get('users_count', 0),
            'events_count': events_data['summary'].get('total_events', 0),
            'event_types': events_data['summary'].get('events_by_type', {}),
            'debug_info': events_data.get('debug', {})
        }
        
        # Préparer un journal détaillé des événements pour l'affichage
        events_log = []
        for user, user_data in events_data['users'].items():
            for day, day_data in user_data.get('days', {}).items():
                for time_slot, event in day_data.items():
                    # Inclure tous les événements, même vides, pour une visualisation complète
                    events_log.append({
                        'user': user,
                        'day': day,
                        'time_slot': time_slot,
                        'content': event.get('content', ''),
                        'type': event.get('type', 'unknown'),
                        'is_weekend': event.get('is_weekend', False),
                        'comment': event.get('comment', ''),
                        'last_modified': event.get('last_modified', ''),
                        'author': event.get('author', '')
                    })
        
        return jsonify({
            'success': True,
            'events': events_data,
            'summary': summary,
            'events_log': events_log
        })
        
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': f'Erreur lors de l\'extraction des événements: {str(e)}',
            'traceback': traceback.format_exc()
        }), 500

@teamplanning_bp.route('/event-results')
def event_results():
    """Affiche les résultats de l'extraction d'événements"""
    # Récupérer le dernier planning brut
    latest_raw_planning = RawPlanning.query.order_by(RawPlanning.created_at.desc()).first()
    
    if not latest_raw_planning:
        flash("Aucun planning n'a encore été récupéré.", "warning")
        return redirect(url_for('teamplanning.index'))
    
    # Extraire tous les événements (tous les utilisateurs, toutes les lignes)
    events_data = NetplanningExtractor.extract_planning_events(
        latest_raw_planning.raw_content,
        limit_to_first_user=False,
        extract_first_line_only=False
    )
    
    # Calculer quelques statistiques
    events_count = 0
    users = []
    
    for user, user_data in events_data['users'].items():
        users.append(user)
        for day, day_data in user_data.get('days', {}).items():
            for time_slot, event in day_data.items():
                if not event.get('is_empty', True) or event.get('is_weekend', False):
                    events_count += 1
    
    # Obtenir le mois et l'année du planning
    latest_parsed_planning = ParsedPlanning.query.filter_by(raw_planning_id=latest_raw_planning.id).first()
    month = "Inconnu"
    year = datetime.now().year
    
    if latest_parsed_planning:
        month = latest_parsed_planning.month
        year = latest_parsed_planning.year
    
    return render_template(
        'teamplanning/event_results.html',
        events=events_data['users'],
        events_count=events_count,
        users=users,
        month=month,
        year=year
    )

@teamplanning_bp.route('/monthly-view')
def monthly_view():
    """Affiche la vue mensuelle du planning"""
    # Récupérer le dernier planning analysé
    latest_planning = ParsedPlanning.query.order_by(ParsedPlanning.created_at.desc()).first()
    
    if not latest_planning:
        flash("Aucun planning n'a encore été récupéré.", "warning")
        return redirect(url_for('teamplanning.index'))
    
    # Obtenir le mois et l'année actuels si nécessaire
    month = request.args.get('month', datetime.now().month, type=int)
    year = request.args.get('year', datetime.now().year, type=int)
    
    # Récupérer les entrées pour ce mois
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    entries = PlanningEntry.query.filter(
        PlanningEntry.parsed_planning_id == latest_planning.id,
        PlanningEntry.date >= start_date,
        PlanningEntry.date < end_date
    ).all()
    
    # Organiser les données par personne et par jour
    people = {}
    days = []
    
    # Créer une liste de tous les jours du mois
    current_date = start_date
    while current_date < end_date:
        days.append(current_date.day)
        current_date += timedelta(days=1)
    
    # Organiser les entrées par personne et par jour
    for entry in entries:
        if entry.person_name not in people:
            people[entry.person_name] = {}
        
        people[entry.person_name][entry.date.day] = {
            'morning': entry.morning,
            'day': entry.day,
            'evening': entry.evening
        }
    
    return render_template(
        'teamplanning/monthly_view.html',
        people=people,
        days=days,
        month=month,
        year=year,
        month_name=start_date.strftime('%B'),
        planning=latest_planning
    )


