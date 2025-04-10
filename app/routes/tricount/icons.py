# app/routes/icons.py
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from app.extensions import db
from app.models.tricount import Icon
from sqlalchemy.exc import IntegrityError

icons_bp = Blueprint('icons', __name__, url_prefix='/icons')

@icons_bp.route('/')
def icons_list():
    """Liste des icônes disponibles"""
    icons = Icon.query.all()
    return render_template('icons/index.html', icons=icons)

@icons_bp.route('/add', methods=['POST'])
def add_icon():
    """Ajouter une nouvelle icône"""
    name = request.form.get('name')
    description = request.form.get('description', '')
    font_awesome_class = request.form.get('font_awesome_class')
    unicode_emoji = request.form.get('unicode_emoji', '')
    
    if not name or not font_awesome_class:
        flash('Le nom et la classe Font Awesome sont requis.', 'warning')
        return redirect(url_for('icons.icons_list'))
    
    icon = Icon(
        name=name, 
        description=description,
        font_awesome_class=font_awesome_class,
        unicode_emoji=unicode_emoji
    )
    
    db.session.add(icon)
    
    try:
        db.session.commit()
        flash(f'Icône "{name}" ajoutée avec succès.', 'success')
    except IntegrityError:
        db.session.rollback()
        flash(f'Une icône avec le nom "{name}" existe déjà.', 'danger')
    
    return redirect(url_for('icons.icons_list'))

@icons_bp.route('/update/<int:icon_id>', methods=['POST'])
def update_icon(icon_id):
    """Mettre à jour une icône"""
    icon = Icon.query.get_or_404(icon_id)
    
    name = request.form.get('name')
    description = request.form.get('description', '')
    font_awesome_class = request.form.get('font_awesome_class')
    unicode_emoji = request.form.get('unicode_emoji', '')
    
    if not name or not font_awesome_class:
        flash('Le nom et la classe Font Awesome sont requis.', 'warning')
        return redirect(url_for('icons.icons_list'))
    
    try:
        icon.name = name
        icon.description = description
        icon.font_awesome_class = font_awesome_class
        icon.unicode_emoji = unicode_emoji
        
        db.session.commit()
        flash(f'Icône "{name}" mise à jour avec succès.', 'success')
    except IntegrityError:
        db.session.rollback()
        flash(f'Une icône avec le nom "{name}" existe déjà.', 'danger')
    
    return redirect(url_for('icons.icons_list'))

@icons_bp.route('/delete/<int:icon_id>', methods=['POST'])
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
    
    return redirect(url_for('icons.icons_list'))

@icons_bp.route('/api/list')
def get_icons():
    """API pour récupérer la liste des icônes au format JSON"""
    icons = Icon.query.all()
    icons_data = [{
        'id': icon.id,
        'name': icon.name,
        'description': icon.description,
        'font_awesome_class': icon.font_awesome_class,
        'unicode_emoji': icon.unicode_emoji
    } for icon in icons]
    
    return jsonify({
        'success': True,
        'icons': icons_data
    })