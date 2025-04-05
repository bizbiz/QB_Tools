# app/routes/tricount/category_routes.py
from flask import render_template, redirect, url_for, flash, request
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Category
from sqlalchemy.exc import IntegrityError

@tricount_bp.route('/categories')
def categories_list():
    """Liste des catégories"""
    categories = Category.query.all()
    flags = Flag.query.all()
    return render_template('tricount/categories.html', categories=categories, flags=flags)

@tricount_bp.route('/categories/add', methods=['POST'])
def add_category():
    """Ajouter une nouvelle catégorie"""
    name = request.form.get('name')
    description = request.form.get('description', '')
    flag_ids = request.form.getlist('flags')
    
    if not name:
        flash('Le nom de la catégorie est requis.', 'warning')
        return redirect(url_for('tricount.categories_list'))
    
    category = Category(
        name=name, 
        description=description
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
    flag_ids = request.form.getlist('flags')
    
    if not name:
        flash('Le nom de la catégorie est requis.', 'warning')
        return redirect(url_for('tricount.categories_list'))
    
    try:
        category.name = name
        category.description = description
        
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
