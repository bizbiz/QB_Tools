# app/routes/auth/user_routes.py
from flask import render_template, redirect, url_for, flash, request
from app.routes.auth import auth_bp
from app.extensions import db
from app.models.user import User, Group
from app.utils.auth_helpers import admin_required
from flask_login import login_required, current_user

@auth_bp.route('/profile')
@login_required
def profile():
    """Affiche le profil de l'utilisateur connecté"""
    return render_template('auth/profile.html')

@auth_bp.route('/users')
@login_required
@admin_required
def users_list():
    """Liste des utilisateurs (admin seulement)"""
    users = User.query.all()
    return render_template('auth/users_list.html', users=users)

@auth_bp.route('/users/add', methods=['GET', 'POST'])
@login_required
@admin_required
def add_user():
    """Ajouter un nouvel utilisateur (admin seulement)"""
    groups = Group.query.all()
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        first_name = request.form.get('first_name', '')
        last_name = request.form.get('last_name', '')
        is_active = request.form.get('is_active') == 'on'
        group_ids = request.form.getlist('groups')
        
        # Vérifier si l'utilisateur existe déjà
        if User.query.filter_by(username=username).first():
            flash(f'Le nom d\'utilisateur "{username}" existe déjà.', 'danger')
            return render_template('auth/add_user.html', groups=groups)
        
        if User.query.filter_by(email=email).first():
            flash(f'L\'email "{email}" est déjà utilisé.', 'danger')
            return render_template('auth/add_user.html', groups=groups)
        
        # Créer le nouvel utilisateur
        user = User(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_active=is_active
        )
        user.set_password(password)
        
        # Ajouter l'utilisateur aux groupes sélectionnés
        if group_ids:
            selected_groups = Group.query.filter(Group.id.in_(group_ids)).all()
            user.groups = selected_groups
        
        db.session.add(user)
        
        try:
            db.session.commit()
            flash(f'Utilisateur "{username}" créé avec succès.', 'success')
            return redirect(url_for('auth.users_list'))
        except Exception as e:
            db.session.rollback()
            flash(f'Erreur lors de la création de l\'utilisateur: {str(e)}', 'danger')
    
    return render_template('auth/add_user.html', groups=groups)

@auth_bp.route('/users/edit/<int:user_id>', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_user(user_id):
    """Modifier un utilisateur existant (admin seulement)"""
    user = User.query.get_or_404(user_id)
    groups = Group.query.all()
    
    if request.method == 'POST':
        email = request.form.get('email')
        first_name = request.form.get('first_name', '')
        last_name = request.form.get('last_name', '')
        is_active = request.form.get('is_active') == 'on'
        group_ids = request.form.getlist('groups')
        new_password = request.form.get('password')
        
        # Vérifier si l'email est déjà utilisé par un autre utilisateur
        email_user = User.query.filter_by(email=email).first()
        if email_user and email_user.id != user.id:
            flash(f'L\'email "{email}" est déjà utilisé.', 'danger')
            return render_template('auth/edit_user.html', user=user, groups=groups)
        
        # Mettre à jour les informations
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.is_active = is_active
        
        # Mettre à jour le mot de passe si un nouveau est fourni
        if new_password:
            user.set_password(new_password)
        
        # Mettre à jour les groupes
        if group_ids:
            selected_groups = Group.query.filter(Group.id.in_(group_ids)).all()
            user.groups = selected_groups
        else:
            user.groups = []
        
        try:
            db.session.commit()
            flash(f'Utilisateur "{user.username}" mis à jour avec succès.', 'success')
            return redirect(url_for('auth.users_list'))
        except Exception as e:
            db.session.rollback()
            flash(f'Erreur lors de la mise à jour de l\'utilisateur: {str(e)}', 'danger')
    
    return render_template('auth/edit_user.html', user=user, groups=groups)

@auth_bp.route('/users/delete/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def delete_user(user_id):
    """Supprimer un utilisateur (admin seulement)"""
    user = User.query.get_or_404(user_id)
    
    # Empêcher la suppression de son propre compte
    if user.id == current_user.id:
        flash('Vous ne pouvez pas supprimer votre propre compte.', 'danger')
        return redirect(url_for('auth.users_list'))
    
    try:
        db.session.delete(user)
        db.session.commit()
        flash(f'Utilisateur "{user.username}" supprimé avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la suppression de l\'utilisateur: {str(e)}', 'danger')
    
    return redirect(url_for('auth.users_list'))