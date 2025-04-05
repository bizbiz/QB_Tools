# app/routes/tricount/export_routes.py
from flask import render_template, redirect, url_for, flash, request, make_response
from app.routes.tricount import tricount_bp
from app.models.tricount import Expense
import csv
from io import StringIO

@tricount_bp.route('/export')
def export_options():
    """Page d'options d'exportation pour Tricount et N2F"""
    # Statistiques des dépenses pour moi
    for_me_expenses = Expense.query.filter_by(for_me=True).all()
    for_me_total = sum(expense.amount for expense in for_me_expenses if expense.is_debit)
    
    for_me_stats = {
        'count': len(for_me_expenses),
        'total': for_me_total,
        'start_date': min([expense.date.strftime('%d/%m/%Y') for expense in for_me_expenses]) if for_me_expenses else None,
        'end_date': max([expense.date.strftime('%d/%m/%Y') for expense in for_me_expenses]) if for_me_expenses else None
    }

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
                          for_me_stats=for_me_stats,
                          tricount_stats=tricount_stats,
                          professional_stats=professional_stats)

@tricount_bp.route('/export/tricount', methods=['POST'])
def export_tricount():
    """Exporter les dépenses pour Tricount (Emily)"""
    participants = request.form.get('participants', '')
    default_payer = request.form.get('default_payer', '')
    equal_split = request.form.get('equal_split') == 'on'
    
    if not participants or not default_payer:
        flash('Les participants et le payeur par défaut sont requis.', 'warning')
        return redirect(url_for('tricount.export_options'))
    
    # Récupérer les dépenses pour Tricount (Emily)
    expenses = Expense.query.filter_by(include_in_tricount=True).order_by(Expense.date.asc()).all()
    
    if not expenses:
        flash('Aucune dépense à exporter pour Tricount.', 'warning')
        return redirect(url_for('tricount.export_options'))
    
    # Préparer le CSV
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