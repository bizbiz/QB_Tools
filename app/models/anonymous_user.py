# app/models/anonymous_user.py
from flask_login import AnonymousUserMixin

class AnonymousUser(AnonymousUserMixin):
    """Classe pour gérer les utilisateurs non connectés"""
    
    def is_admin(self):
        """Un utilisateur non connecté n'est jamais administrateur"""
        return False
    
    def has_permission(self, tool_name, permission_name):
        """Un utilisateur non connecté n'a jamais de permissions"""
        return False