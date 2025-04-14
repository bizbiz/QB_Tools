# app/routes/tricount/import_routes.py
from flask import render_template, redirect, url_for, flash, request
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense
from app.services.tricount import SocieteGeneraleParser, N26Parser
from sqlalchemy.exc import IntegrityError

@tricount_bp.route('/import', methods=['GET'])
def import_expenses():
    """Page principale de sélection de la méthode d'importation"""
    return render_template('tricount/import.html')

def process_transactions(transactions, source):
    """
    Traite une liste de transactions pour les importer dans la base de données
    
    Args:
        transactions (list): Liste des transactions à importer
        source (str): Source des transactions (societe_generale, n26, etc.)
        
    Returns:
        tuple: (imported_count, duplicate_count, success)
    """
    imported_count = 0
    duplicate_count = 0
    
    for transaction in transactions:
        # Créer un identifiant unique pour éviter les doublons
        unique_id = Expense.generate_unique_identifier(
            transaction['date'],
            transaction['description'],
            transaction['amount']
        )
        
        # Vérifier si cette dépense existe déjà
        existing = Expense.query.filter_by(unique_identifier=unique_id).first()
        if existing:
            duplicate_count += 1
            continue
        
        # Créer une nouvelle dépense
        expense = Expense(
            date=transaction['date'],
            description=transaction['description'],
            amount=transaction['amount'],
            is_debit=transaction.get('is_debit', True),
            merchant=transaction.get('merchant', ''),
            payment_method=transaction.get('payment_method', ''),
            reference=transaction.get('reference', ''),
            original_text=transaction.get('original_text', ''),
            unique_identifier=unique_id,
            source=source  # Ajouter la source
        )
        
        db.session.add(expense)
        imported_count += 1
    
    try:
        db.session.commit()
        return (imported_count, duplicate_count, True)
    except IntegrityError:
        db.session.rollback()
        return (imported_count, duplicate_count, False)

@tricount_bp.route('/import/societe-generale', methods=['GET', 'POST'])
def import_expenses_societe_generale():
    """Page d'importation des dépenses depuis un relevé Société Générale"""
    if request.method == 'POST':
        statement_text = request.form.get('statement_text', '')
        
        if not statement_text:
            flash('Veuillez fournir le texte du relevé bancaire.', 'warning')
            return redirect(url_for('tricount.import_expenses_societe_generale'))
        
        # Analyser le texte pour extraire les dépenses
        transactions = SocieteGeneraleParser.parse_statement(statement_text)
        
        if not transactions:
            flash('Aucune transaction n\'a pu être extraite du texte fourni.', 'warning')
            return redirect(url_for('tricount.import_expenses_societe_generale'))
        
        # Traiter les transactions avec la source
        imported_count, duplicate_count, success = process_transactions(transactions, 'societe_generale')
        
        if success:
            flash(f'{imported_count} transactions importées avec succès. {duplicate_count} transactions ignorées (doublons).', 'success')
        else:
            flash('Erreur lors de l\'importation des transactions. Certaines transactions pourraient être des doublons.', 'danger')
        
        return redirect(url_for('tricount.expenses_list'))
    
    return render_template('tricount/import_societe_generale.html')

@tricount_bp.route('/import/n26', methods=['GET', 'POST'])
def import_expenses_n26():
    """Page d'importation des dépenses depuis un fichier CSV N26"""
    if request.method == 'POST':
        # Vérifier si un fichier a été uploadé
        if 'csv_file' not in request.files:
            flash('Aucun fichier CSV n\'a été sélectionné.', 'warning')
            return redirect(url_for('tricount.import_expenses_n26'))
        
        csv_file = request.files['csv_file']
        
        # Vérifier si le fichier est valide
        if csv_file.filename == '':
            flash('Aucun fichier CSV n\'a été sélectionné.', 'warning')
            return redirect(url_for('tricount.import_expenses_n26'))
        
        if not csv_file.filename.lower().endswith('.csv'):
            flash('Le fichier doit être au format CSV.', 'warning')
            return redirect(url_for('tricount.import_expenses_n26'))
        
        # Lire le contenu du fichier
        try:
            csv_content = csv_file.read().decode('utf-8')
        except UnicodeDecodeError:
            try:
                # Essayer avec un autre encodage si utf-8 échoue
                csv_file.seek(0)  # Revenir au début du fichier
                csv_content = csv_file.read().decode('latin-1')
            except:
                flash('Impossible de lire le fichier CSV. Vérifiez l\'encodage du fichier.', 'danger')
                return redirect(url_for('tricount.import_expenses_n26'))
        
        # Analyser le fichier CSV N26
        try:
            transactions = N26Parser.parse_csv(csv_content)
        except Exception as e:
            flash(f'Erreur lors de l\'analyse du fichier CSV: {str(e)}', 'danger')
            return redirect(url_for('tricount.import_expenses_n26'))
        
        if not transactions:
            flash('Aucune transaction n\'a pu être extraite du fichier fourni.', 'warning')
            return redirect(url_for('tricount.import_expenses_n26'))
        
        # Traiter les transactions avec la source
        imported_count, duplicate_count, success = process_transactions(transactions, 'n26')
        
        if success:
            flash(f'{imported_count} transactions importées avec succès. {duplicate_count} transactions ignorées (doublons).', 'success')
        else:
            flash('Erreur lors de l\'importation des transactions. Certaines transactions pourraient être des doublons.', 'danger')
        
        return redirect(url_for('tricount.expenses_list'))
    
    return render_template('tricount/import_n26.html')