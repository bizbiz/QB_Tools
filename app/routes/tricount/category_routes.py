# app/routes/tricount/category_routes.py
from flask import render_template, redirect, url_for, flash, request, jsonify
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Category, Flag
from sqlalchemy.exc import IntegrityError

@tricount_bp.route('/categories')
def categories_list():
    """Liste des catégories"""
    categories = Category.query.all()
    flags = Flag.query.all()
    
    # Configuration pour le sélecteur d'icônes Iconify
    iconify_config = {
        'collections': ['mdi', 'fa-solid', 'material-symbols', 'fluent', 'carbon'],
        'limit': 48
    }
    
    return render_template('tricount/categories.html', 
                          categories=categories, 
                          flags=flags,
                          iconify_config=iconify_config)

@tricount_bp.route('/categories/add', methods=['POST'])
def add_category():
    """Ajouter une nouvelle catégorie"""
    name = request.form.get('name')
    description = request.form.get('description', '')
    iconify_id = request.form.get('iconify_id', '')  # Récupérer l'ID Iconify
    color = request.form.get('color', '#e9ecef')  # Récupérer la couleur
    flag_ids = request.form.getlist('flags')
    
    if not name:
        flash('Le nom de la catégorie est requis.', 'warning')
        return redirect(url_for('tricount.categories_list'))
    
    category = Category(
        name=name, 
        description=description,
        iconify_id=iconify_id,
        color=color
    )
    
    # Associer les flags sélectionnés
    if flag_ids:
        flags = Flag.query.filter(Flag.id.in_(flag_ids)).all()
        category.flags = flags
    
    db.session.add(category)
    
    try:
        db.session.commit()
        flash(f'Catégorie "{name}" ajoutée avec succès.', 'success')
    except IntegrityError:
        db.session.rollback()
        flash(f'Une catégorie avec le nom "{name}" existe déjà.', 'danger')
    
    return redirect(url_for('tricount.categories_list'))

@tricount_bp.route('/categories/update/<int:category_id>', methods=['POST'])
def update_category(category_id):
    """Mettre à jour une catégorie"""
    category = Category.query.get_or_404(category_id)
    
    name = request.form.get('name')
    description = request.form.get('description', '')
    iconify_id = request.form.get('iconify_id', '')  # Récupérer l'ID Iconify
    color = request.form.get('color', '#e9ecef')  # Récupérer la couleur
    flag_ids = request.form.getlist('flags')
    
    if not name:
        flash('Le nom de la catégorie est requis.', 'warning')
        return redirect(url_for('tricount.categories_list'))
    
    try:
        category.name = name
        category.description = description
        category.iconify_id = iconify_id
        category.color = color
        
        # Mettre à jour les flags
        if flag_ids:
            flags = Flag.query.filter(Flag.id.in_(flag_ids)).all()
            category.flags = flags
        else:
            category.flags = []
        
        db.session.commit()
        flash(f'Catégorie "{name}" mise à jour avec succès.', 'success')
    except IntegrityError:
        db.session.rollback()
        flash(f'Une catégorie avec le nom "{name}" existe déjà.', 'danger')
    
    return redirect(url_for('tricount.categories_list'))

@tricount_bp.route('/categories/<int:category_id>/info')
def category_info(category_id):
    """API pour récupérer les informations d'une catégorie"""
    category = Category.query.get_or_404(category_id)
    
    # Obtenir le premier flag associé comme flag préféré
    preferred_flag = category.flags[0] if category.flags else None
    preferred_flag_id = preferred_flag.id if preferred_flag else None
    
    return jsonify({
        'success': True,
        'category': {
            'id': category.id,
            'name': category.name,
            'description': category.description,
            'color': category.color,
            'iconify_id': category.iconify_id
        },
        'preferred_flag_id': preferred_flag_id,
        'flags': [{'id': flag.id, 'name': flag.name} for flag in category.flags]
    })

@tricount_bp.route('/categories/delete/<int:category_id>', methods=['POST'])
def delete_category(category_id):
    """Supprimer une catégorie"""
    category = Category.query.get_or_404(category_id)
    
    try:
        db.session.delete(category)
        db.session.commit()
        flash(f'Catégorie "{category.name}" supprimée avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la suppression de la catégorie: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.categories_list'))