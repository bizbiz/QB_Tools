# app/models/error_following.py
from app.extensions import db
from datetime import datetime
from flask import request, session
from flask_login import current_user
import json

class ErrorFollowing(db.Model):
    """
    Modèle pour suivre les erreurs dans l'application
    Permet d'enregistrer les erreurs plutôt que de les afficher dans les logs
    """
    __tablename__ = 'error_following'
    
    id = db.Column(db.Integer, primary_key=True)
    error_type = db.Column(db.String(50), nullable=False)            # 'redirection', 'exception', '404', '500', etc.
    source = db.Column(db.String(255), nullable=False)               # Source de l'erreur (route, template, etc.)
    message = db.Column(db.Text, nullable=False)                     # Message d'erreur
    stack_trace = db.Column(db.Text, nullable=True)                  # Stack trace pour les exceptions
    
    # Informations contextuelles
    user_id = db.Column(db.Integer, nullable=True)                   # ID de l'utilisateur (si connecté)
    user_email = db.Column(db.String(100), nullable=True)            # Email de l'utilisateur (si connecté)
    url = db.Column(db.String(2000), nullable=True)                  # URL de la requête
    referrer = db.Column(db.String(2000), nullable=True)             # URL de référence (page précédente)
    request_method = db.Column(db.String(10), nullable=True)         # Méthode HTTP (GET, POST, etc.)
    request_data = db.Column(db.Text, nullable=True)                 # Données de la requête (JSON ou form)
    user_agent = db.Column(db.String(500), nullable=True)            # User-Agent du navigateur
    ip_address = db.Column(db.String(50), nullable=True)             # Adresse IP du client
    
    # Métadonnées
    created_at = db.Column(db.DateTime, default=datetime.utcnow)     # Date de création
    resolved = db.Column(db.Boolean, default=False)                  # Indique si l'erreur a été résolue
    resolved_at = db.Column(db.DateTime, nullable=True)              # Quand l'erreur a été résolue
    
    def __repr__(self):
        return f'<ErrorFollowing {self.id}: {self.error_type} from {self.source}>'
    
    @classmethod
    def create_from_exception(cls, error_type, source, message, stack_trace=None, additional_info=None):
        """
        Crée une nouvelle entrée d'erreur à partir d'une exception
        
        Args:
            error_type (str): Type d'erreur ('exception', '500', etc.)
            source (str): Source de l'erreur (route, fonction, etc.)
            message (str): Message d'erreur
            stack_trace (str, optional): Stack trace de l'exception
            additional_info (dict, optional): Informations additionnelles
            
        Returns:
            ErrorFollowing: L'instance créée (non sauvegardée)
        """
        # Créer l'instance de base
        error = cls(
            error_type=error_type,
            source=source,
            message=message,
            stack_trace=stack_trace
        )
        
        # Ajouter les informations contextuelles de la requête si disponible
        if request:
            error.url = request.url
            error.referrer = request.referrer
            error.request_method = request.method
            error.ip_address = request.remote_addr
            
            # User-Agent
            if request.user_agent:
                error.user_agent = request.user_agent.string
            
            # Données de la requête (POST ou JSON)
            request_data = {}
            if request.form:
                request_data['form'] = {k: v for k, v in request.form.items()}
            if request.args:
                request_data['args'] = {k: v for k, v in request.args.items()}
            if request.is_json and request.json:
                request_data['json'] = request.json
            
            # Sécuriser les données sensibles (mots de passe, etc.)
            if 'form' in request_data and 'password' in request_data['form']:
                request_data['form']['password'] = '[REDACTED]'
            
            if request_data:
                try:
                    error.request_data = json.dumps(request_data)
                except:
                    error.request_data = str(request_data)
        
        # Ajouter les informations de l'utilisateur si connecté
        try:
            if current_user and current_user.is_authenticated:
                error.user_id = current_user.id
                error.user_email = current_user.email
        except:
            # Ignorer les erreurs d'accès à current_user
            pass
            
        # Ajouter les informations additionnelles
        if additional_info:
            # Si des infos additionnelles sont fournies, les fusionner avec le stack_trace
            # sous forme de JSON
            try:
                existing_data = {}
                if error.stack_trace and error.stack_trace.startswith('{'):
                    try:
                        existing_data = json.loads(error.stack_trace)
                    except:
                        existing_data = {"original_stack_trace": error.stack_trace}
                else:
                    if error.stack_trace:
                        existing_data = {"original_stack_trace": error.stack_trace}
                
                # Fusionner avec les nouvelles données
                existing_data.update(additional_info)
                error.stack_trace = json.dumps(existing_data, default=str)
            except:
                # En cas d'erreur, conserver le stack_trace original
                pass
        
        return error