# app/routes/tricount/import_routes.py
from flask import render_template, redirect, url_for, flash, request
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Expense
from app.services.tricount import SocieteGeneraleParser
from sqlalchemy.exc import IntegrityError

@tricount_bp.route('/import', methods=['GET', 'POST'])
def import_expenses():
    """Page d'importation des dépenses"""
    if request.method == 'POST':
        statement_text = request.form.get('statement_text', '')
        
        if not statement_text:
            flash('Veuillez fournir le texte du relevé bancaire.', 'warning')
            return redirect(url_for('tricount.import_expenses'))
        
        # Analyser le texte pour extraire les dépenses
        transactions = SocieteGeneraleParser.parse_statement(statement_text)
        
        if not transactions:
            flash('Aucune transaction n\'a pu être extraite du texte fourni.', 'warning')
            return redirect(url_for('tricount.import_expenses'))
        
        # Compter les transactions importées et les doublons
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
                unique_identifier=unique_id
            )
            
            db.session.add(expense)
            imported_count += 1
        
        try:
            db.session.commit()
            flash(f'{imported_count} transactions importées avec succès. {duplicate_count} transactions ignorées (doublons).', 'success')
        except IntegrityError:
            db.session.rollback()
            flash('Erreur lors de l\'importation des transactions. Certaines transactions pourraient être des doublons.', 'danger')
        
        return redirect(url_for('tricount.expenses_list'))
    
    return render_template('tricount/import.html')