# app/models/error_following.py
from app.extensions import db
from datetime import datetime

class ErrorFollowing(db.Model):
    """
    Modèle pour suivre les erreurs dans l'application
    Permet d'enregistrer les erreurs plutôt que de les afficher dans les logs
    """
    __tablename__ = 'error_following'
    
    id = db.Column(db.Integer, primary_key=True)
    error_type = db.Column(db.String(50), nullable=False)  # 'redirection', 'exception', etc.
    source = db.Column(db.String(255), nullable=False)     # Source de l'erreur (route, template, etc.)
    message = db.Column(db.Text, nullable=False)           # Message d'erreur
    stack_trace = db.Column(db.Text, nullable=True)        # Stack trace pour les exceptions
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved = db.Column(db.Boolean, default=False)        # Indique si l'erreur a été résolue
    resolved_at = db.Column(db.DateTime, nullable=True)    # Quand l'erreur a été résolue
    
    def __repr__(self):
        return f'<ErrorFollowing {self.id}: {self.error_type} from {self.source}>'