# app/commands.py
"""
Commandes personnalisées pour l'application Flask
"""
import click
from flask.cli import with_appcontext
from app.extensions import db
from app.models.tricount import Category
from sqlalchemy.exc import IntegrityError

@click.command('init_tricount_categories')
@with_appcontext
def init_tricount_categories():
    """Initialise les catégories par défaut pour le module Tricount"""
    
    # Liste des catégories par défaut
    default_categories = [
        {
            'name': 'Alimentation',
            'description': 'Courses alimentaires, restaurants, cafés'
        },
        {
            'name': 'Logement',
            'description': 'Loyer, charges, électricité, eau, internet, assurance habitation'
        },
        {
            'name': 'Transport',
            'description': 'Transports en commun, essence, péages, entretien véhicule'
        },
        {
            'name': 'Santé',
            'description': 'Médecin, pharmacie, mutuelle'
        },
        {
            'name': 'Loisirs',
            'description': 'Sorties, cinéma, sports, abonnements'
        },
        {
            'name': 'Vacances',
            'description': 'Voyages, hôtels, billets d\'avion'
        },
        {
            'name': 'Shopping',
            'description': 'Vêtements, électronique, décoration'
        },
        {
            'name': 'Services',
            'description': 'Coiffeur, pressing, services divers'
        },
        {
            'name': 'Abonnements',
            'description': 'Netflix, Spotify, téléphone, etc.'
        },
        {
            'name': 'Éducation',
            'description': 'Cours, livres, formations'
        },
        {
            'name': 'Cadeaux',
            'description': 'Cadeaux offerts à d\'autres personnes'
        },
        {
            'name': 'Impôts & taxes',
            'description': 'Impôts sur le revenu, taxe d\'habitation'
        },
        {
            'name': 'Épargne',
            'description': 'Virements vers des comptes d\'épargne'
        },
        {
            'name': 'Revenus',
            'description': 'Salaires, primes, dividendes'
        },
        {
            'name': 'Dépenses professionnelles',
            'description': 'Dépenses liées au travail, à rembourser par l\'employeur'
        },
        {
            'name': 'Frais bancaires',
            'description': 'Commissions, frais de tenue de compte'
        },
        {
            'name': 'Divers',
            'description': 'Autres dépenses non catégorisables'
        }
    ]
    
    # Compteurs
    created = 0
    existing = 0
    
    # Créer chaque catégorie si elle n'existe pas déjà
    for category_data in default_categories:
        existing_category = Category.query.filter_by(name=category_data['name']).first()
        
        if not existing_category:
            category = Category(
                name=category_data['name'],
                description=category_data['description']
            )
            db.session.add(category)
            created += 1
        else:
            existing += 1
    
    try:
        db.session.commit()
        click.echo(f"Initialisation des catégories terminée : {created} catégories créées, {existing} déjà existantes.")
    except IntegrityError as e:
        db.session.rollback()
        click.echo(f"Erreur lors de l'initialisation des catégories : {e}", err=True)
        return False
    
    return True

# Commande simplifiée sans tiret
@click.command('tricount_init')
@with_appcontext
def tricount_init():
    """Alias simplifié pour initialiser les catégories Tricount"""
    return init_tricount_categories()

def register_commands(app):
    """Enregistre toutes les commandes personnalisées"""
    app.cli.add_command(init_tricount_categories)
    app.cli.add_command(tricount_init)  # Ajouter également la version simplifiée