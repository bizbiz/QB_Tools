# app/routes/tricount/category_routes.py
from flask import render_template, redirect, url_for, flash, request
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Category, Flag
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
    icon = request.form.get('icon', '')  # Récupération de l'icône
    flag_ids = request.form.getlist('flags')
    
    if not name:
        flash('Le nom de la catégorie est requis.', 'warning')
        return redirect(url_for('tricount.categories_list'))
    
    category = Category(
        name=name, 
        description=description,
        icon=icon  # Ajout de l'icône
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

@tricount_bp.route('/category/<int:category_id>/info')
def category_info(category_id):
    """API pour récupérer les informations d'une catégorie, y compris son flag préféré"""
    category = Category.query.get_or_404(category_id)
    
    # Obtenir le premier flag associé comme flag préféré
    preferred_flag = category.flags[0] if category.flags else None
    preferred_flag_id = preferred_flag.id if preferred_flag else None
    
    return jsonify({
        'success': True,
        'preferred_flag_id': preferred_flag_id,
        'flags': [{'id': flag.id, 'name': flag.name} for flag in category.flags]
    })

@tricount_bp.route('/categories/update/<int:category_id>', methods=['POST'])
def update_category(category_id):
    """Mettre à jour une catégorie"""
    category = Category.query.get_or_404(category_id)
    
    name = request.form.get('name')
    description = request.form.get('description', '')
    icon = request.form.get('icon', '')  # Récupération de l'icône
    flag_ids = request.form.getlist('flags')
    
    if not name:
        flash('Le nom de la catégorie est requis.', 'warning')
        return redirect(url_for('tricount.categories_list'))
    
    try:
        category.name = name
        category.description = description
        category.icon = icon  # Mise à jour de l'icône
        
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


# À ajouter à app/routes/tricount/category_routes.py

@tricount_bp.route('/diagnostic/categories-flags')
def diagnostic_categories_flags():
    """Endpoint de diagnostic pour vérifier les associations catégories-flags"""
    # Récupération des données
    categories = Category.query.all()
    flags = Flag.query.all()
    
    # Préparation de l'affichage
    data = {
        'categories': [],
        'flags': [],
        'associations': []
    }
    
    # Récupérer les infos des catégories
    for category in categories:
        cat_info = {
            'id': category.id,
            'name': category.name,
            'icon': category.icon,
            'flags': [flag.id for flag in category.flags]
        }
        data['categories'].append(cat_info)
    
    # Récupérer les infos des flags
    for flag in flags:
        flag_info = {
            'id': flag.id,
            'name': flag.name,
            'is_default': flag.is_default
        }
        data['flags'].append(flag_info)
    
    # Vérifier la table d'association directement
    from sqlalchemy import text
    
    # Requête SQL directe sur la table d'association
    result = db.session.execute(text("SELECT category_id, flag_id FROM category_flags"))
    for row in result:
        data['associations'].append({
            'category_id': row[0],
            'flag_id': row[1]
        })
    
    from flask import jsonify
    return jsonify(data)

# À ajouter à app/routes/tricount/category_routes.py

@tricount_bp.route('/maintenance/fix-category-flags')
def fix_category_flags():
    """Endpoint de maintenance pour vérifier et réparer les associations catégories-flags"""
    # Récupération des données
    categories = Category.query.all()
    flags = Flag.query.all()
    
    # Vérifier l'état actuel
    current_associations = []
    for category in categories:
        cat_info = {
            'id': category.id,
            'name': category.name,
            'flags': [{'id': flag.id, 'name': flag.name} for flag in category.flags]
        }
        current_associations.append(cat_info)
    
    # Créer un dictionnaire des catégories par ID pour faciliter la manipulation
    categories_dict = {cat.id: cat for cat in categories}
    flags_dict = {flag.id: flag for flag in flags}
    
    # Vérifier la table d'association directement
    from sqlalchemy import text
    
    # Vérifier les incohérences en base de données (par exemple, associations vers des IDs inexistants)
    result = db.session.execute(text("SELECT category_id, flag_id FROM category_flags"))
    invalid_associations = []
    for row in result:
        cat_id, flag_id = row[0], row[1]
        
        if cat_id not in categories_dict:
            invalid_associations.append(f"Catégorie ID {cat_id} inexistante associée au flag ID {flag_id}")
        
        if flag_id not in flags_dict:
            invalid_associations.append(f"Flag ID {flag_id} inexistant associé à la catégorie ID {cat_id}")
    
    # Si demandé, réparer les catégories qui doivent être associées au flag "Logement"
    # Cette partie est spécifique au bug mentionné
    fix_requested = request.args.get('fix', False)
    fixed_items = []
    
    if fix_requested:
        # Exemple: Associer le flag 2 (Tricount Emily) à la catégorie "Logement"
        logement = Category.query.filter_by(name="Logement").first()
        tricount_flag = Flag.query.filter_by(name="Tricount Emily").first()
        
        if logement and tricount_flag and tricount_flag not in logement.flags:
            logement.flags.append(tricount_flag)
            db.session.commit()
            fixed_items.append(f"Catégorie 'Logement' associée au flag 'Tricount Emily'")
        
        # Vous pouvez ajouter d'autres corrections spécifiques ici
    
    # Réponse JSON avec les données
    from flask import jsonify
    return jsonify({
        'categories': len(categories),
        'flags': len(flags),
        'current_associations': current_associations,
        'invalid_associations': invalid_associations,
        'fixed_items': fixed_items if fix_requested else "Aucune réparation effectuée (ajoutez ?fix=1 à l'URL pour réparer)"
    })