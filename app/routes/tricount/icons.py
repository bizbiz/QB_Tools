# app/routes/tricount/icons.py
from flask import render_template, redirect, url_for, flash, request, jsonify
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.icons import Icon  # Utiliser notre nouveau modèle d'icône
from sqlalchemy.exc import IntegrityError
import json
import requests

# Collections d'icônes disponibles via Iconify
ICONIFY_COLLECTIONS = [
    'fa-solid', 'fa-regular', 'fa-brands',  # Font Awesome
    'material-symbols', 'mdi',              # Material Design
    'bi', 'bx', 'clarity', 'fluent',        # Autres collections populaires
    'carbon', 'healthicons', 'ep', 'jam'
]

@tricount_bp.route('/icons')
def icons_list():
    """Liste des icônes disponibles avec recherche améliorée"""
    icons = Icon.query.all()
    
    # Paramètres pour le sélecteur d'icônes
    iconify_config = {
        'collections': ICONIFY_COLLECTIONS,
        'apiEndpoint': 'https://api.iconify.design'
    }
    
    return render_template('tricount/icons.html', 
                          icons=icons, 
                          iconify_config=iconify_config)

@tricount_bp.route('/icons/add', methods=['POST'])
def add_icon():
    """Ajouter une nouvelle icône"""
    name = request.form.get('name')
    description = request.form.get('description', '')
    iconify_id = request.form.get('iconify_id', '')
    font_awesome_class = request.form.get('font_awesome_class', '')
    unicode_emoji = request.form.get('unicode_emoji', '')
    category = request.form.get('category', '')
    tags = request.form.get('tags', '')
    
    if not name or (not iconify_id and not font_awesome_class and not unicode_emoji):
        flash('Le nom et au moins un type d\'icône sont requis.', 'warning')
        return redirect(url_for('tricount.icons_list'))
    
    icon = Icon(
        name=name, 
        description=description,
        iconify_id=iconify_id if iconify_id else None,
        font_awesome_class=font_awesome_class if font_awesome_class else None,
        unicode_emoji=unicode_emoji if unicode_emoji else None,
        category=category,
        tags=tags
    )
    
    db.session.add(icon)
    
    try:
        db.session.commit()
        flash(f'Icône "{name}" ajoutée avec succès.', 'success')
    except IntegrityError:
        db.session.rollback()
        flash(f'Une icône avec le nom "{name}" existe déjà.', 'danger')
    
    return redirect(url_for('tricount.icons_list'))

@tricount_bp.route('/icons/update/<int:icon_id>', methods=['POST'])
def update_icon(icon_id):
    """Mettre à jour une icône"""
    icon = Icon.query.get_or_404(icon_id)
    
    name = request.form.get('name')
    description = request.form.get('description', '')
    iconify_id = request.form.get('iconify_id', '')
    font_awesome_class = request.form.get('font_awesome_class', '')
    unicode_emoji = request.form.get('unicode_emoji', '')
    category = request.form.get('category', '')
    tags = request.form.get('tags', '')
    
    if not name or (not iconify_id and not font_awesome_class and not unicode_emoji):
        flash('Le nom et au moins un type d\'icône sont requis.', 'warning')
        return redirect(url_for('tricount.icons_list'))
    
    try:
        icon.name = name
        icon.description = description
        icon.iconify_id = iconify_id if iconify_id else None
        icon.font_awesome_class = font_awesome_class if font_awesome_class else None
        icon.unicode_emoji = unicode_emoji if unicode_emoji else None
        icon.category = category
        icon.tags = tags
        
        db.session.commit()
        flash(f'Icône "{name}" mise à jour avec succès.', 'success')
    except IntegrityError:
        db.session.rollback()
        flash(f'Une icône avec le nom "{name}" existe déjà.', 'danger')
    
    return redirect(url_for('tricount.icons_list'))

@tricount_bp.route('/icons/delete/<int:icon_id>', methods=['POST'])
def delete_icon(icon_id):
    """Supprimer une icône"""
    icon = Icon.query.get_or_404(icon_id)
    
    try:
        db.session.delete(icon)
        db.session.commit()
        flash(f'Icône "{icon.name}" supprimée avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la suppression de l\'icône: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.icons_list'))

@tricount_bp.route('/icons/search')
def search_icons():
    """API pour rechercher des icônes (internes et Iconify)"""
    query = request.args.get('q', '')
    collection = request.args.get('collection', '')
    language = request.args.get('lang', 'fr')  # Langue par défaut: français
    
    # Recherche dans la base de données locale
    local_icons = Icon.search(query)
    local_results = [{
        'id': icon.id,
        'name': icon.name,
        'description': icon.description,
        'type': 'local',
        'iconify_id': icon.iconify_id,
        'font_awesome_class': icon.font_awesome_class,
        'unicode_emoji': icon.unicode_emoji
    } for icon in local_icons]
    
    # Recherche via l'API Iconify si une collection est spécifiée
    iconify_results = []
    if collection and len(query) >= 2:
        try:
            api_url = f"https://api.iconify.design/search?query={query}&limit=24&collections={collection}&lang={language}"
            response = requests.get(api_url)
            if response.status_code == 200:
                data = response.json()
                iconify_results = [{
                    'id': icon,
                    'name': icon.split(':')[1],
                    'collection': icon.split(':')[0],
                    'type': 'iconify',
                    'iconify_id': icon
                } for icon in data.get('icons', [])]
        except Exception as e:
            print(f"Erreur lors de la recherche Iconify: {str(e)}")
    
    # Combiner les résultats
    results = {
        'local': local_results,
        'iconify': iconify_results
    }
    
    return jsonify(results)

@tricount_bp.route('/icons/preview/<string:icon_id>')
def preview_icon(icon_id):
    """Génère une prévisualisation d'une icône Iconify sans l'enregistrer"""
    try:
        # Demander les données SVG à l'API Iconify
        api_url = f"https://api.iconify.design/{icon_id.replace(':', '/')}.svg"
        response = requests.get(api_url)
        
        if response.status_code == 200:
            return response.text, 200, {'Content-Type': 'image/svg+xml'}
        else:
            return jsonify({'error': 'Icône non trouvée'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500