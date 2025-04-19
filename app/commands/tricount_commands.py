# app/commands/tricount_commands.py
"""
Commandes personnalisées pour le module tricount
"""
import click
from flask.cli import with_appcontext
from app.extensions import db
from app.models.tricount import Category

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
    except Exception as e:
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


@click.command('migrate_merchant_names')
@with_appcontext
def migrate_merchant_names():
    """Migre les noms de marchands modifiés vers la structure renamed_merchant"""
    from app.models.tricount import Expense
    from app.services.tricount.bank_statement_parser import SocieteGeneraleParser
    
    # Compteurs pour statistiques
    total = 0
    modified = 0
    skipped = 0
    errors = 0
    
    # Récupérer toutes les dépenses avec un original_text
    expenses = Expense.query.filter(Expense.original_text.isnot(None)).all()
    
    click.echo(f"Analyse de {len(expenses)} dépenses avec texte original...")
    
    for expense in expenses:
        total += 1
        try:
            # Extraire le nom du marchand du texte original
            original_merchant = None
            
            # Si c'est une carte, le marchand est généralement sur la première ligne
            if 'CARTE' in expense.original_text and '\n' in expense.original_text:
                first_line = expense.original_text.split('\n')[0].strip()
                
                # Format typique: "CARTE XXXX 01/02 MARCHAND"
                parts = first_line.split(' ')
                if len(parts) > 3:
                    # Tout après la date (qui est au format XX/XX) est le marchand
                    date_index = -1
                    for i, part in enumerate(parts):
                        if '/' in part and len(part) == 5:  # Format XX/XX
                            date_index = i
                            break
                    
                    if date_index >= 0 and date_index < len(parts) - 1:
                        original_merchant = ' '.join(parts[date_index + 1:])
            
            # Si c'est un prélèvement, chercher après "DE:" ou "POUR:"
            elif 'PRELEVEMENT' in expense.original_text and '\n' in expense.original_text:
                first_line = expense.original_text.split('\n')[0].strip()
                
                if 'DE:' in first_line:
                    original_merchant = first_line.split('DE:')[1].strip()
                elif 'POUR:' in first_line:
                    original_merchant = first_line.split('POUR:')[1].strip()
            
            # Si c'est un virement, chercher après "DE:" ou "POUR:"
            elif 'VIR' in expense.original_text and '\n' in expense.original_text:
                first_line = expense.original_text.split('\n')[0].strip()
                
                if 'DE:' in first_line:
                    original_merchant = first_line.split('DE:')[1].strip()
                elif 'POUR:' in first_line:
                    original_merchant = first_line.split('POUR:')[1].strip()
            
            # Si on n'a pas trouvé de marchand, utiliser le service d'analyse
            if not original_merchant and expense.original_text:
                # Essayer de parser avec le service existant
                try:
                    transactions = SocieteGeneraleParser.parse_statement(expense.original_text)
                    if transactions:
                        original_merchant = transactions[0].get('merchant')
                except:
                    pass
            
            # Si on a trouvé un marchand original différent du merchant actuel
            if original_merchant and original_merchant != expense.merchant and not expense.renamed_merchant:
                click.echo(f"ID {expense.id}: Migrer '{expense.merchant}' -> '{original_merchant}'")
                
                # Le nom actuel devient le nom renommé
                expense.renamed_merchant = expense.merchant
                
                # Le nom original devient le merchant
                expense.merchant = original_merchant
                
                modified += 1
            else:
                skipped += 1
                
        except Exception as e:
            click.echo(f"Erreur lors du traitement de la dépense {expense.id}: {str(e)}")
            errors += 1
    
    # Sauvegarder les modifications
    try:
        db.session.commit()
        click.echo(f"Migration terminée: {modified} marchands migrés, {skipped} ignorés, {errors} erreurs")
    except Exception as e:
        db.session.rollback()
        click.echo(f"Erreur lors de l'enregistrement des modifications: {str(e)}")
    
    return True