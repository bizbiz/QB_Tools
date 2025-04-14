# app/routes/tricount/flag_routes.py
from flask import render_template, redirect, url_for, flash, request, jsonify
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Flag

@tricount_bp.route('/flags')
def flags_list():
    """Liste des flags de dépenses"""
    flags = Flag.query.all()
    
    # Configuration pour le sélecteur d'icônes Iconify
    iconify_config = {
        'collections': ['mdi', 'fa-solid', 'material-symbols', 'fluent', 'carbon'],
        'limit': 48
    }
    
    return render_template('tricount/flags.html', flags=flags, iconify_config=iconify_config)

@tricount_bp.route('/flags/add', methods=['POST'])
def add_flag():
    """Ajouter un nouveau flag"""
    name = request.form.get('name')
    description = request.form.get('description', '')
    color = request.form.get('color', '#0366d6')
    iconify_id = request.form.get('iconify_id', '')  # Récupérer l'ID Iconify
    is_default = request.form.get('is_default') == 'on'
    # Nouvelle propriété : type de remboursement
    reimbursement_type = request.form.get('reimbursement_type', 'not_reimbursable')
    
    if not name:
        flash('Le nom du flag est requis.', 'warning')
        return redirect(url_for('tricount.flags_list'))
    
    # Si ce flag est défini comme par défaut, réinitialiser les autres
    if is_default:
        Flag.query.filter_by(is_default=True).update({Flag.is_default: False})
    
    flag = Flag(
        name=name, 
        description=description,
        color=color,
        iconify_id=iconify_id,
        is_default=is_default,
        reimbursement_type=reimbursement_type  # Ajout du type de remboursement
    )
    db.session.add(flag)
    
    try:
        db.session.commit()
        flash(f'Flag "{name}" ajouté avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de l\'ajout du flag: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.flags_list'))

@tricount_bp.route('/flags/delete/<int:flag_id>', methods=['POST'])
def delete_flag(flag_id):
    """Supprimer un flag"""
    flag = Flag.query.get_or_404(flag_id)
    
    # Vérifier si ce flag est utilisé
    expenses_count = flag.expenses.count()
    if expenses_count > 0:
        flash(f'Impossible de supprimer le flag "{flag.name}". Il est utilisé par {expenses_count} dépenses.', 'danger')
        return redirect(url_for('tricount.flags_list'))
    
    try:
        # Supprimer les associations
        db.session.execute(db.delete(category_flags).where(category_flags.c.flag_id == flag_id))
        db.session.delete(flag)
        db.session.commit()
        flash(f'Flag "{flag.name}" supprimé avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la suppression du flag: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.flags_list'))

@tricount_bp.route('/flags/update/<int:flag_id>', methods=['POST'])
def update_flag(flag_id):
    """Mettre à jour un flag"""
    flag = Flag.query.get_or_404(flag_id)
    
    name = request.form.get('name')
    description = request.form.get('description', '')
    color = request.form.get('color', '#0366d6')
    iconify_id = request.form.get('iconify_id', '')
    is_default = request.form.get('is_default') == 'on'
    # Nouvelle propriété : type de remboursement
    reimbursement_type = request.form.get('reimbursement_type', 'not_reimbursable')
    
    if not name:
        flash('Le nom du flag est requis.', 'warning')
        return redirect(url_for('tricount.flags_list'))
    
    try:
        # Si ce flag est défini comme par défaut, réinitialiser les autres
        if is_default and not flag.is_default:
            Flag.query.filter_by(is_default=True).update({Flag.is_default: False})
        
        flag.name = name
        flag.description = description
        flag.color = color
        flag.iconify_id = iconify_id
        flag.is_default = is_default
        flag.reimbursement_type = reimbursement_type  # Mise à jour du type de remboursement
        
        db.session.commit()
        flash(f'Flag "{name}" mis à jour avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la mise à jour du flag: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.flags_list'))

@tricount_bp.route('/flags/get-all')
def get_all_flags():
    """API pour récupérer tous les flags avec leurs statistiques"""
    flags = Flag.query.all()
    
    result = []
    for flag in flags:
        result.append({
            'id': flag.id,
            'name': flag.name,
            'description': flag.description,
            'color': flag.color,
            'iconify_id': flag.iconify_id,
            'is_default': flag.is_default,
            'expenses_count': flag.expenses.count()
        })
    
    return jsonify(result)