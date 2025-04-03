# app/models/planning.py
from app.extensions import db
from datetime import datetime
import json

class RawPlanning(db.Model):
    """Modèle pour stocker le contenu brut du planning récupéré de Netplanning"""
    __tablename__ = 'raw_plannings'
    
    id = db.Column(db.Integer, primary_key=True)
    content_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    raw_content = db.Column(db.Text, nullable=False)
    parsed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<RawPlanning {self.id} created at {self.created_at}>'

class ParsedPlanning(db.Model):
    """Modèle pour stocker les données de planning analysées"""
    __tablename__ = 'parsed_plannings'
    
    id = db.Column(db.Integer, primary_key=True)
    raw_planning_id = db.Column(db.Integer, db.ForeignKey('raw_plannings.id'), nullable=False)
    month = db.Column(db.String(20), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    planning_data = db.Column(db.Text, nullable=False)  # JSON du planning analysé
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relation avec le planning brut
    raw_planning = db.relationship('RawPlanning', backref=db.backref('parsed_planning', uselist=False))
    
    def get_planning_data(self):
        """Retourne les données de planning au format Python"""
        return json.loads(self.planning_data)
    
    def __repr__(self):
        return f'<ParsedPlanning {self.id} for {self.month}/{self.year}>'


class PlanningEntry(db.Model):
    """Modèle pour stocker chaque entrée individuelle du planning"""
    __tablename__ = 'planning_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    parsed_planning_id = db.Column(db.Integer, db.ForeignKey('parsed_plannings.id'), nullable=False)
    person_name = db.Column(db.String(100), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    morning = db.Column(db.String(50))
    day = db.Column(db.String(50))
    evening = db.Column(db.String(50))
    
    # Relation avec le planning analysé
    parsed_planning = db.relationship('ParsedPlanning', backref=db.backref('entries', lazy='dynamic'))
    
    def __repr__(self):
        return f'<PlanningEntry {self.person_name} on {self.date}>'