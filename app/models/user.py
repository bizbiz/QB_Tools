# app/models/user.py
from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from datetime import datetime

# Table d'association pour les utilisateurs et les groupes
user_groups = db.Table('user_groups',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('group_id', db.Integer, db.ForeignKey('groups.id'), primary_key=True)
)

# Table d'association pour les groupes et les permissions
group_permissions = db.Table('group_permissions',
    db.Column('group_id', db.Integer, db.ForeignKey('groups.id'), primary_key=True),
    db.Column('permission_id', db.Integer, db.ForeignKey('permissions.id'), primary_key=True)
)

class User(db.Model, UserMixin):
    """Modèle pour stocker les utilisateurs"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False, unique=True)
    email = db.Column(db.String(100), nullable=False, unique=True)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relation avec les groupes (many-to-many)
    groups = db.relationship('Group', secondary=user_groups, 
                           lazy='subquery', backref=db.backref('users', lazy=True))
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def set_password(self, password):
        """Définit le mot de passe haché pour l'utilisateur"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Vérifie si le mot de passe correspond au hash"""
        return check_password_hash(self.password_hash, password)
    
    def has_permission(self, tool_name, permission_name):
        """Vérifie si l'utilisateur a une permission spécifique pour un outil"""
        for group in self.groups:
            for permission in group.permissions:
                if permission.tool == tool_name and permission.name == permission_name:
                    return True
        return False
    
    def is_admin(self):
        """Vérifie si l'utilisateur est administrateur"""
        return any(group.name == 'admin' for group in self.groups)

class Group(db.Model):
    """Modèle pour stocker les groupes d'utilisateurs"""
    __tablename__ = 'groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relation avec les permissions (many-to-many)
    permissions = db.relationship('Permission', secondary=group_permissions, 
                                lazy='subquery', backref=db.backref('groups', lazy=True))
    
    def __repr__(self):
        return f'<Group {self.name}>'

class Permission(db.Model):
    """Modèle pour stocker les permissions"""
    __tablename__ = 'permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    tool = db.Column(db.String(100), nullable=False)  # Nom de l'outil (tricount, teamplanning, etc.)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('name', 'tool', name='_name_tool_uc'),
    )
    
    def __repr__(self):
        return f'<Permission {self.name} for {self.tool}>'