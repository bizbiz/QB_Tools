# app/routes/teamplanning.py
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from app.extensions import db
import requests

teamplanning_bp = Blueprint('teamplanning', __name__, url_prefix='/teamplanning')

@teamplanning_bp.route('/')
def index():
    """Page principale du module Teamplanning"""
    return render_template('teamplanning/index.html')

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
            return jsonify({
                'success': True,
                'content': response.text
            })
        else:
            return jsonify({
                'success': False, 
                'error': f'Erreur lors de la récupération des données (code {response.status_code})'
            }), 500
            
    except requests.exceptions.RequestException as e:
        return jsonify({'success': False, 'error': f'Erreur de connexion: {str(e)}'}), 500