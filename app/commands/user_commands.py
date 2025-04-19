# app/commands/user_commands.py
import click
from flask.cli import with_appcontext
from app.extensions import db
from app.models.user import User, Group, Permission
from sqlalchemy.exc import IntegrityError

@click.command('init_users')
@with_appcontext
def init_users():
    """Initialise les utilisateurs, groupes et permissions par défaut"""
    
    # Créer les permissions
    permissions = [
        # Permissions pour Teamplanning
        {
            'name': 'view',
            'description': 'Accès en lecture au module Teamplanning',
            'tool': 'teamplanning'
        },
        {
            'name': 'edit',
            'description': 'Accès en écriture au module Teamplanning',
            'tool': 'teamplanning'
        },
        {
            'name': 'admin',
            'description': 'Administration du module Teamplanning',
            'tool': 'teamplanning'
        },
        # Permissions pour Tricount
        {
            'name': 'view',
            'description': 'Accès en lecture au module Tricount',
            'tool': 'tricount'
        },
        {
            'name': 'edit',
            'description': 'Accès en écriture au module Tricount',
            'tool': 'tricount'
        },
        {
            'name': 'admin',
            'description': 'Administration du module Tricount',
            'tool': 'tricount'
        }
    ]
    
    created_permissions = []
    for perm_data in permissions:
        existing = Permission.query.filter_by(name=perm_data['name'], tool=perm_data['tool']).first()
        if not existing:
            perm = Permission(
                name=perm_data['name'],
                description=perm_data['description'],
                tool=perm_data['tool']
            )
            db.session.add(perm)
            created_permissions.append(perm)
            click.echo(f"Permission créée: {perm.name} pour {perm.tool}")
    
    # Créer les groupes
    groups = [
        {
            'name': 'admin',
            'description': 'Administrateurs avec accès complet'
        },
        {
            'name': 'user',
            'description': 'Utilisateurs standards'
        },
        {
            'name': 'teamplanning_user',
            'description': 'Utilisateurs du module Teamplanning'
        },
        {
            'name': 'tricount_user',
            'description': 'Utilisateurs du module Tricount'
        }
    ]
    
    created_groups = []
    for group_data in groups:
        existing = Group.query.filter_by(name=group_data['name']).first()
        if not existing:
            group = Group(
                name=group_data['name'],
                description=group_data['description']
            )
            db.session.add(group)
            created_groups.append(group)
            click.echo(f"Groupe créé: {group.name}")
        else:
            created_groups.append(existing)
    
    # Associer les permissions aux groupes
    try:
        db.session.flush()  # Enregistrer temporairement pour obtenir les IDs
        
        # Récupérer tous les groupes et permissions pour les associations
        all_groups = Group.query.all()
        all_permissions = Permission.query.all()
        
        # Groupe admin: toutes les permissions
        admin_group = next((g for g in all_groups if g.name == 'admin'), None)
        if admin_group:
            admin_group.permissions = all_permissions
            click.echo("Groupe admin: toutes les permissions accordées")
        
        # Groupe user: permissions de lecture uniquement
        user_group = next((g for g in all_groups if g.name == 'user'), None)
        if user_group:
            user_group.permissions = [p for p in all_permissions if p.name == 'view']
            click.echo("Groupe user: permissions de lecture accordées")
        
        # Groupe teamplanning_user: permissions teamplanning
        teamplanning_group = next((g for g in all_groups if g.name == 'teamplanning_user'), None)
        if teamplanning_group:
            teamplanning_group.permissions = [p for p in all_permissions if p.tool == 'teamplanning' and p.name in ['view', 'edit']]
            click.echo("Groupe teamplanning_user: permissions teamplanning accordées")
        
        # Groupe tricount_user: permissions tricount
        tricount_group = next((g for g in all_groups if g.name == 'tricount_user'), None)
        if tricount_group:
            tricount_group.permissions = [p for p in all_permissions if p.tool == 'tricount' and p.name in ['view', 'edit']]
            click.echo("Groupe tricount_user: permissions tricount accordées")
    
        # Créer un utilisateur admin par défaut s'il n'existe pas
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            admin_group = Group.query.filter_by(name='admin').first()
            if admin_group:
                admin_user = User(
                    username='admin',
                    email='admin@example.com',
                    first_name='Admin',
                    last_name='User',
                    is_active=True
                )
                admin_user.set_password('admin123')  # Mot de passe par défaut
                admin_user.groups = [admin_group]
                db.session.add(admin_user)
                click.echo("Utilisateur admin créé (mot de passe: admin123)")
        
        db.session.commit()
        click.echo("Initialisation des utilisateurs, groupes et permissions terminée.")
    except IntegrityError as e:
        db.session.rollback()
        click.echo(f"Erreur lors de l'initialisation: {e}")
        return False
    
    return True

# Commande simplifiée sans tiret
@click.command('users_init')
@with_appcontext
def users_init():
    """Alias simplifié pour initialiser les utilisateurs"""
    return init_users()

def register_commands(app):
    """Enregistre toutes les commandes personnalisées pour les utilisateurs"""
    app.cli.add_command(init_users)
    app.cli.add_command(users_init)