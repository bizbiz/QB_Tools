# app/routes/tricount/pending_rules_routes.py
from flask import render_template, redirect, url_for, flash, request
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import AutoCategorizationRule, Expense, PendingRuleApplication
import re

@tricount_bp.route('/pending-rules')
def pending_rules_list():
    """Liste des règles en attente de confirmation"""
    # Récupérer toutes les applications de règles en attente
    pending_applications = PendingRuleApplication.query.all()
    
    # Grouper par règle pour l'affichage
    grouped_applications = {}
    for pending in pending_applications:
        if pending.rule_id not in grouped_applications:
            grouped_applications[pending.rule_id] = {
                'rule': pending.rule,
                'expenses': [],
                'pending_ids': []
            }
        grouped_applications[pending.rule_id]['expenses'].append(pending.expense)
        grouped_applications[pending.rule_id]['pending_ids'].append(pending.id)
    
    return render_template('tricount/pending_rules.html', 
                           grouped_applications=grouped_applications)

@tricount_bp.route('/pending-rules/confirm/<int:rule_id>', methods=['POST'])
def confirm_rule_application(rule_id):
    """Confirmer l'application d'une règle à toutes les dépenses en attente"""
    rule = AutoCategorizationRule.query.get_or_404(rule_id)
    
    # Récupérer toutes les applications en attente pour cette règle
    pending_applications = PendingRuleApplication.query.filter_by(rule_id=rule_id).all()
    
    # Compter les dépenses affectées
    count = 0
    
    for pending in pending_applications:
        expense = pending.expense
        
        # Appliquer les actions activées
        if rule.apply_category and rule.category_id:
            expense.category_id = rule.category_id
        
        if rule.apply_flag and rule.flag_id:
            expense.flag_id = rule.flag_id
        
        if rule.apply_rename and rule.rename_pattern:
            # Appliquer le renommage si configuré
            if rule.rename_pattern and expense.merchant:
                expense.merchant = re.sub(rule.rename_pattern, 
                                         rule.rename_replacement or '', 
                                         expense.merchant)
        
        # Enregistrer la relation entre la règle et la dépense
        rule.affected_expenses.append(expense)
        
        # Supprimer l'application en attente
        db.session.delete(pending)
        
        count += 1
    
    try:
        db.session.commit()
        flash(f'Règle "{rule.name}" appliquée avec succès à {count} dépenses.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de l\'application de la règle: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.pending_rules_list'))

@tricount_bp.route('/pending-rules/reject/<int:rule_id>', methods=['POST'])
def reject_rule_application(rule_id):
    """Rejeter l'application d'une règle à toutes les dépenses en attente"""
    # Supprimer toutes les applications en attente pour cette règle
    pending_applications = PendingRuleApplication.query.filter_by(rule_id=rule_id).all()
    
    count = len(pending_applications)
    
    for pending in pending_applications:
        db.session.delete(pending)
    
    try:
        db.session.commit()
        flash(f'Application de la règle rejetée pour {count} dépenses.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors du rejet de l\'application: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.pending_rules_list'))

@tricount_bp.route('/pending-rules/confirm-expense/<int:pending_id>', methods=['POST'])
def confirm_expense_rule(pending_id):
    """Confirmer l'application d'une règle à une dépense spécifique"""
    pending = PendingRuleApplication.query.get_or_404(pending_id)
    
    rule = pending.rule
    expense = pending.expense
    
    # Appliquer les actions activées
    if rule.apply_category and rule.category_id:
        expense.category_id = rule.category_id
    
    if rule.apply_flag and rule.flag_id:
        expense.flag_id = rule.flag_id
    
    if rule.apply_rename and rule.rename_pattern:
        # Appliquer le renommage si configuré
        if rule.rename_pattern and expense.merchant:
            expense.merchant = re.sub(rule.rename_pattern, 
                                     rule.rename_replacement or '', 
                                     expense.merchant)
    
    # Enregistrer la relation entre la règle et la dépense
    rule.affected_expenses.append(expense)
    
    # Supprimer l'application en attente
    db.session.delete(pending)
    
    try:
        db.session.commit()
        flash(f'Règle appliquée à la dépense avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de l\'application de la règle: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.pending_rules_list'))

@tricount_bp.route('/pending-rules/reject-expense/<int:pending_id>', methods=['POST'])
def reject_expense_rule(pending_id):
    """Rejeter l'application d'une règle à une dépense spécifique"""
    pending = PendingRuleApplication.query.get_or_404(pending_id)
    
    # Supprimer l'application en attente
    db.session.delete(pending)
    
    try:
        db.session.commit()
        flash(f'Application de la règle rejetée pour cette dépense.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors du rejet de l\'application: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.pending_rules_list'))