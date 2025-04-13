# app/routes/tricount/admin_routes.py
# Créez ce nouveau fichier s'il n'existe pas déjà

from flask import render_template, redirect, url_for, flash, request
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense
from app.services.tricount.bank_statement_parser import SocieteGeneraleParser
import traceback

def extract_original_merchant(expense):
    """Extrait le nom du marchand depuis le texte original"""
    original_merchant = None
    
    # Si c'est une carte, le marchand est généralement sur la première ligne
    if expense.original_text and 'CARTE' in expense.original_text and '\n' in expense.original_text:
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
    elif expense.original_text and 'PRELEVEMENT' in expense.original_text and '\n' in expense.original_text:
        first_line = expense.original_text.split('\n')[0].strip()
        
        if 'DE:' in first_line:
            original_merchant = first_line.split('DE:')[1].strip()
        elif 'POUR:' in first_line:
            original_merchant = first_line.split('POUR:')[1].strip()
    
    # Si c'est un virement, chercher après "DE:" ou "POUR:"
    elif expense.original_text and 'VIR' in expense.original_text and '\n' in expense.original_text:
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
    
    return original_merchant

@tricount_bp.route('/admin/fix-renamed-merchants', methods=['GET'])
def fix_renamed_merchants():
    """Page d'administration pour corriger les noms de marchands"""
    
    # Vérifier si une action a été demandée
    action = request.args.get('action', '')
    
    if action == 'execute':
        # Compteurs pour statistiques
        results = {
            'total': 0,
            'modified': 0,
            'skipped': 0,
            'errors': 0,
            'error_details': []
        }
        
        # Récupérer toutes les dépenses avec un original_text
        expenses = Expense.query.filter(Expense.original_text.isnot(None)).all()
        results['total'] = len(expenses)
        
        for expense in expenses:
            try:
                # Extraire le nom du marchand du texte original
                original_merchant = extract_original_merchant(expense)
                
                # Si on a trouvé un marchand original différent du merchant actuel
                if original_merchant and original_merchant != expense.merchant and not expense.renamed_merchant:
                    # Le nom actuel devient le nom renommé
                    expense.renamed_merchant = expense.merchant
                    
                    # Le nom original devient le merchant
                    expense.merchant = original_merchant
                    
                    results['modified'] += 1
                else:
                    results['skipped'] += 1
                    
            except Exception as e:
                results['errors'] += 1
                results['error_details'].append({
                    'expense_id': expense.id,
                    'error': str(e),
                    'traceback': traceback.format_exc()
                })
        
        # Sauvegarder les modifications
        try:
            db.session.commit()
            flash(f"Migration terminée: {results['modified']} marchands migrés, {results['skipped']} ignorés, {results['errors']} erreurs", 'success')
        except Exception as e:
            db.session.rollback()
            flash(f"Erreur lors de l'enregistrement des modifications: {str(e)}", 'danger')
            results['error_details'].append({
                'expense_id': 'commit',
                'error': str(e),
                'traceback': traceback.format_exc()
            })
        
        return render_template('tricount/admin/fix_renamed_merchants.html', 
                              results=results, 
                              executed=True)
    
    # Afficher la page sans exécuter la migration
    preview_data = []
    
    # Récupérer quelques exemples pour prévisualisation
    sample_expenses = Expense.query.filter(Expense.original_text.isnot(None)).limit(10).all()
    
    for expense in sample_expenses:
        # Extraire le marchand original pour la prévisualisation
        extracted_merchant = extract_original_merchant(expense)
        
        # Déterminer si cette dépense sera migrée
        will_be_migrated = (
            extracted_merchant and 
            extracted_merchant != expense.merchant and 
            not expense.renamed_merchant
        )
        
        preview_item = {
            'id': expense.id,
            'current_merchant': expense.merchant,
            'renamed_merchant': expense.renamed_merchant,
            'extracted_merchant': extracted_merchant,
            'will_be_migrated': will_be_migrated,
            'original_text': expense.original_text[:100] + '...' if len(expense.original_text) > 100 else expense.original_text,
            'date': expense.date.strftime('%d/%m/%Y'),
            'amount': f"{'-' if expense.is_debit else ''}{expense.amount} €"
        }
        preview_data.append(preview_item)
    
    return render_template('tricount/admin/fix_renamed_merchants.html', 
                          preview_data=preview_data, 
                          executed=False)