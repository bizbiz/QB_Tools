# app/routes/tricount.py
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify, make_response
from app.extensions import db
from app.models.tricount import Expense, Category
from app.services.tricount import SocieteGeneraleParser
from sqlalchemy.exc import IntegrityError
from datetime import datetime

tricount_bp = Blueprint('tricount', __name__, url_prefix='/tricount')

@tricount_bp.route('/')
def index():
    """Page principale du module Tricount Helper"""
    # Récupérer les statistiques des dépenses
    expenses_stats = {
        'total': Expense.query.count(),
        'uncategorized': Expense.query.filter_by(category_id=None).count(),
        'tricount': Expense.query.filter_by(include_in_tricount=True).count(),
        'professional': Expense.query.filter_by(is_professional=True).count()
    }
    
    # Récupérer les dernières dépenses
    recent_expenses = Expense.query.order_by(Expense.date.desc()).limit(5).all()
    
    return render_template('tricount/index.html', 
                           expenses_stats=expenses_stats,
                           recent_expenses=recent_expenses)

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

@tricount_bp.route('/expenses')
def expenses_list():
    """Liste des dépenses"""
    # Filtres
    category_id = request.args.get('category_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    include_tricount = request.args.get('tricount', type=int)
    is_professional = request.args.get('professional', type=int)
    
    # Construire la requête
    query = Expense.query
    
    if category_id:
        query = query.filter_by(category_id=category_id)
    
    if start_date:
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Expense.date >= start_date)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(Expense.date <= end_date)
        except ValueError:
            pass
    
    if include_tricount is not None:
        query = query.filter_by(include_in_tricount=bool(include_tricount))
    
    if is_professional is not None:
        query = query.filter_by(is_professional=bool(is_professional))
    
    # Tri
    sort_by = request.args.get('sort', 'date')
    order = request.args.get('order', 'desc')
    
    if sort_by == 'date':
        query = query.order_by(Expense.date.desc() if order == 'desc' else Expense.date)
    elif sort_by == 'amount':
        query = query.order_by(Expense.amount.desc() if order == 'desc' else Expense.amount)
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = 20
    expenses = query.paginate(page=page, per_page=per_page)
    
    # Catégories pour le filtre
    categories = Category.query.all()
    
    return render_template('tricount/expenses_list.html',
                          expenses=expenses,
                          categories=categories)

@tricount_bp.route('/categorize')
def categorize_expenses():
    """Page pour catégoriser les dépenses"""
    # Récupérer les dépenses non catégorisées
    uncategorized = Expense.query.filter_by(category_id=None).order_by(Expense.date.desc()).all()
    
    # Récupérer toutes les catégories
    categories = Category.query.all()
    
    return render_template('tricount/categorize.html',
                          expenses=uncategorized,
                          categories=categories)

@tricount_bp.route('/expenses/update', methods=['POST'])
def update_expense():
    """API pour mettre à jour une dépense"""
    expense_id = request.form.get('expense_id', type=int)
    category_id = request.form.get('category_id', type=int)
    include_tricount = request.form.get('include_tricount') == 'true'
    is_professional = request.form.get('is_professional') == 'true'
    
    if not expense_id:
        return jsonify({'success': False, 'error': 'ID de dépense non fourni'}), 400
    
    expense = Expense.query.get_or_404(expense_id)
    
    if category_id:
        expense.category_id = category_id
    
    expense.include_in_tricount = include_tricount
    expense.is_professional = is_professional
    
    try:
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@tricount_bp.route('/categories')
def categories_list():
    """Liste des catégories"""
    categories = Category.query.all()
    return render_template('tricount/categories.html', categories=categories)

@tricount_bp.route('/categories/add', methods=['POST'])
def add_category():
    """Ajouter une nouvelle catégorie"""
    name = request.form.get('name')
    description = request.form.get('description', '')
    include_in_tricount = 'include_in_tricount' in request.form
    is_professional = 'is_professional' in request.form
    
    if not name:
        flash('Le nom de la catégorie est requis.', 'warning')
        return redirect(url_for('tricount.categories_list'))
    
    category = Category(
        name=name, 
        description=description,
        include_in_tricount=include_in_tricount,
        is_professional=is_professional
    )
    db.session.add(category)
    
    try:
        db.session.commit()
        flash(f'Catégorie "{name}" ajoutée avec succès.', 'success')
    except IntegrityError:
        db.session.rollback()
        flash(f'Une catégorie avec le nom "{name}" existe déjà.', 'danger')
    
    return redirect(url_for('tricount.categories_list'))

@tricount_bp.route('/export')
def export_options():
    """Page d'options d'exportation pour Tricount et N2F"""
    # Statistiques des dépenses pour Tricount
    tricount_expenses = Expense.query.filter_by(include_in_tricount=True).all()
    tricount_total = sum(expense.amount for expense in tricount_expenses if expense.is_debit)
    tricount_stats = {
        'count': len(tricount_expenses),
        'total': tricount_total,
        'start_date': min([expense.date.strftime('%d/%m/%Y') for expense in tricount_expenses]) if tricount_expenses else None,
        'end_date': max([expense.date.strftime('%d/%m/%Y') for expense in tricount_expenses]) if tricount_expenses else None
    }
    
    # Statistiques des dépenses professionnelles
    professional_expenses = Expense.query.filter_by(is_professional=True).all()
    professional_total = sum(expense.amount for expense in professional_expenses if expense.is_debit)
    professional_stats = {
        'count': len(professional_expenses),
        'total': professional_total,
        'start_date': min([expense.date.strftime('%d/%m/%Y') for expense in professional_expenses]) if professional_expenses else None,
        'end_date': max([expense.date.strftime('%d/%m/%Y') for expense in professional_expenses]) if professional_expenses else None
    }
    
    return render_template('tricount/export.html',
                          tricount_stats=tricount_stats,
                          professional_stats=professional_stats)

@tricount_bp.route('/export/tricount', methods=['POST'])
def export_tricount():
    """Exporter les dépenses pour Tricount"""
    participants = request.form.get('participants', '')
    default_payer = request.form.get('default_payer', '')
    equal_split = request.form.get('equal_split') == 'on'
    
    if not participants or not default_payer:
        flash('Les participants et le payeur par défaut sont requis.', 'warning')
        return redirect(url_for('tricount.export_options'))
    
    # Récupérer les dépenses pour Tricount
    expenses = Expense.query.filter_by(include_in_tricount=True).order_by(Expense.date.asc()).all()
    
    if not expenses:
        flash('Aucune dépense à exporter pour Tricount.', 'warning')
        return redirect(url_for('tricount.export_options'))
    
    # Préparer le CSV
    import csv
    from io import StringIO
    
    output = StringIO()
    writer = csv.writer(output)
    
    # En-tête
    participant_list = [p.strip() for p in participants.split(',')]
    header = ['Date', 'Title', 'Amount', 'Payer']
    for participant in participant_list:
        header.append(participant)
    
    writer.writerow(header)
    
    # Lignes de dépenses
    for expense in expenses:
        if expense.is_debit:  # Seules les dépenses, pas les revenus
            # Formatage de la date
            date_str = expense.date.strftime('%d/%m/%Y')
            
            # Titre de la dépense
            title = expense.merchant if expense.merchant else expense.description
            
            # Montant
            amount = float(expense.amount)
            
            # Payeur (par défaut)
            payer = default_payer
            
            # Répartition
            row = [date_str, title, amount, payer]
            
            if equal_split:
                # Répartition égale
                for _ in participant_list:
                    row.append('1')
            else:
                # Tous les participants par défaut
                for _ in participant_list:
                    row.append('1')
            
            writer.writerow(row)
    
    # Préparer la réponse
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=tricount_export.csv"
    response.headers["Content-type"] = "text/csv"
    
    return response

@tricount_bp.route('/export/n2f', methods=['POST'])
def export_n2f():
    """Exporter les dépenses professionnelles pour N2F"""
    employee_name = request.form.get('employee_name', '')
    employee_id = request.form.get('employee_id', '')
    project = request.form.get('project', '')
    
    if not employee_name:
        flash('Le nom de l\'employé est requis.', 'warning')
        return redirect(url_for('tricount.export_options'))
    
    # Récupérer les dépenses professionnelles
    expenses = Expense.query.filter_by(is_professional=True).order_by(Expense.date.asc()).all()
    
    if not expenses:
        flash('Aucune dépense professionnelle à exporter pour N2F.', 'warning')
        return redirect(url_for('tricount.export_options'))
    
    # Préparer le CSV
    import csv
    from io import StringIO
    
    output = StringIO()
    writer = csv.writer(output)
    
    # En-tête
    header = ['Date', 'Merchant', 'Category', 'Amount', 'Currency', 'Employee', 'EmployeeID', 'Project', 'Description']
    writer.writerow(header)
    
    # Lignes de dépenses
    for expense in expenses:
        if expense.is_debit:  # Seules les dépenses, pas les revenus
            # Formatage de la date
            date_str = expense.date.strftime('%d/%m/%Y')
            
            # Merchant
            merchant = expense.merchant if expense.merchant else ""
            
            # Catégorie
            category = expense.category.name if expense.category else "Autre"
            
            # Montant
            amount = float(expense.amount)
            
            # Devise
            currency = "EUR"
            
            # Description
            description = expense.description if expense.description else ""
            
            row = [date_str, merchant, category, amount, currency, employee_name, employee_id, project, description]
            writer.writerow(row)
    
    # Préparer la réponse
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=n2f_export.csv"
    response.headers["Content-type"] = "text/csv"
    
    return response

@tricount_bp.route('/categories/delete/<int:category_id>', methods=['POST'])
def delete_category(category_id):
    """Supprimer une catégorie"""
    category = Category.query.get_or_404(category_id)
    
    try:
        db.session.delete(category)
        db.session.commit()
        flash(f'Catégorie "{category.name}" supprimée avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la suppression de la catégorie: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.categories_list'))
    """Supprimer une catégorie"""
    category = Category.query.get_or_404(category_id)
    
    try:
        db.session.delete(category)
        db.session.commit()
        flash(f'Catégorie "{category.name}" supprimée avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la suppression de la catégorie: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.categories_list'))

@tricount_bp.route('/categories/update/<int:category_id>', methods=['POST'])
def update_category(category_id):
    """Mettre à jour une catégorie"""
    category = Category.query.get_or_404(category_id)
    
    name = request.form.get('name')
    description = request.form.get('description', '')
    include_in_tricount = 'include_in_tricount' in request.form
    is_professional = 'is_professional' in request.form
    
    if not name:
        flash('Le nom de la catégorie est requis.', 'warning')
        return redirect(url_for('tricount.categories_list'))
    
    try:
        category.name = name
        category.description = description
        category.include_in_tricount = include_in_tricount
        category.is_professional = is_professional
        
        db.session.commit()
        flash(f'Catégorie "{name}" mise à jour avec succès.', 'success')
    except IntegrityError:
        db.session.rollback()
        flash(f'Une catégorie avec le nom "{name}" existe déjà.', 'danger')
    
    return redirect(url_for('tricount.categories_list'))