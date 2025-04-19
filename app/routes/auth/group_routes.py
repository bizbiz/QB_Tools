# app/routes/auth/group_routes.py
from flask import render_template, redirect, url_for, flash, request, jsonify
from app.routes.auth import auth_bp
from app.extensions import db
from app.models.user import Group, Permission
from app.utils.auth_helpers import admin_required
from flask_login import login_required

@auth_bp.route('/groups')
@login_required
@admin_required
def groups_list():
    """Liste des groupes (admin seulement)"""
    groups = Group.query.all()
    return render_template('auth/groups_list.html', groups=groups)

@auth_bp.route('/groups/add', methods=['GET', 'POST'])
@login_required
@admin_required
def add_group():
    """Ajouter un nouveau groupe (admin seulement)"""
    # Récupérer toutes les permissions pour l'affichage
    permissions = Permission.query.all()
    
    if request.method == 'POST':
        name = request.form.get('name')
        description = request.form.get('description', '')
        permission_ids = request.form.getlist('permissions')
        
        # Vérifier si le groupe existe déjà
        if Group.query.filter_by(name=name).first():
            flash(f'Le groupe "{name}" existe déjà.', 'danger')
            return render_template('auth/add_group.html', permissions=permissions)
        
        # Créer le nouveau groupe
        group = Group(
            name=name,
            description=description
        )
        
        # Ajouter les permissions sélectionnées
        if permission_ids:
            selected_permissions = Permission.query.filter(Permission.id.in_(permission_ids)).all()
            group.permissions = selected_permissions
        
        db.session.add(group)
        
        try:
            db.session.commit()
            flash(f'Groupe "{name}" créé avec succès.', 'success')
            return redirect(url_for('auth.groups_list'))
        except Exception as e:
            db.session.rollback()
            flash(f'Erreur lors de la création du groupe: {str(e)}', 'danger')
    
    return render_template('auth/add_group.html', permissions=permissions)

@auth_bp.route('/groups/edit/<int:group_id>', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_group(group_id):
    """Modifier un groupe existant (admin seulement)"""
    group = Group.query.get_or_404(group_id)
    permissions = Permission.query.all()
    
    if request.method == 'POST':
        name = request.form.get('name')
        description = request.form.get('description', '')
        permission_ids = request.form.getlist('permissions')
        
        # Vérifier si le nom est déjà utilisé par un autre groupe
        name_group = Group.query.filter_by(name=name).first()
        if name_group and name_group.id != group.id:
            flash(f'Le nom "{name}" est déjà utilisé.', 'danger')
            return render_template('auth/edit_group.html', group=group, permissions=permissions)
        
        # Mettre à jour les informations
        group.name = name
        group.description = description
        
        # Mettre à jour les permissions
        if permission_ids:
            selected_permissions = Permission.query.filter(Permission.id.in_(permission_ids)).all()
            group.permissions = selected_permissions
        else:
            group.permissions = []
        
        try:
            db.session.commit()
            flash(f'Groupe "{name}" mis à jour avec succès.', 'success')
            return redirect(url_for('auth.groups_list'))
        except Exception as e:
            db.session.rollback()
            flash(f'Erreur lors de la mise à jour du groupe: {str(e)}', 'danger')
    
    return render_template('auth/edit_group.html', group=group, permissions=permissions)

@auth_bp.route('/groups/delete/<int:group_id>', methods=['POST'])
@login_required
@admin_required
def delete_group(group_id):
    """Supprimer un groupe (admin seulement)"""
    group = Group.query.get_or_404(group_id)
    
    # Empêcher la suppression du groupe admin
    if group.name == 'admin':
        flash('Vous ne pouvez pas supprimer le groupe administrateur.', 'danger')
        return redirect(url_for('auth.groups_list'))
    
    try:
        db.session.delete(group)
        db.session.commit()
        flash(f'Groupe "{group.name}" supprimé avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la suppression du groupe: {str(e)}', 'danger')
    
    return redirect(url_for('auth.groups_list'))