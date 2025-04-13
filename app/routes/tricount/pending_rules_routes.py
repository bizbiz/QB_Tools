# app/routes/tricount/pending_rules_routes.py
from flask import render_template, redirect, url_for, flash, request
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import AutoCategorizationRule, Expense, PendingRuleApplication, Category, Flag, ModificationSource
from app.utils.rename_helpers import apply_rule_rename
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
    
    # Récupérer toutes les catégories et flags pour les sélecteurs
    categories = Category.query.all()
    flags = Flag.query.all()
    
    return render_template('tricount/pending_rules.html', 
                           grouped_applications=grouped_applications,
                           categories=categories,
                           flags=flags)

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
            expense.category_modified_by = ModificationSource.AUTO_RULE_CONFIRMED.value
        
        if rule.apply_flag and rule.flag_id:
            expense.flag_id = rule.flag_id
            expense.flag_modified_by = ModificationSource.AUTO_RULE_CONFIRMED.value
        
        if rule.apply_rename and rule.rename_pattern:
            # Utiliser la fonction helper pour le renommage
            apply_rule_rename(expense, rule, ModificationSource.AUTO_RULE_CONFIRMED.value)
        
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
        expense.category_modified_by = ModificationSource.AUTO_RULE_CONFIRMED.value
    
    if rule.apply_flag and rule.flag_id:
        expense.flag_id = rule.flag_id
        expense.flag_modified_by = ModificationSource.AUTO_RULE_CONFIRMED.value
    
    if rule.apply_rename and rule.rename_pattern:
        # Appliquer le renommage si configuré
        apply_rule_rename(expense, rule, ModificationSource.AUTO_RULE_CONFIRMED.value)
    
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

@tricount_bp.route('/pending-rules/edit/<int:pending_id>', methods=['POST'])
def edit_pending_rule_application(pending_id):
    """Éditer une application de règle en attente avant de la confirmer"""
    pending = PendingRuleApplication.query.get_or_404(pending_id)
    expense = pending.expense
    rule = pending.rule
    
    # Récupérer les nouvelles valeurs
    category_id = request.form.get('category_id', type=int)
    flag_id = request.form.get('flag_id', type=int)
    notes = request.form.get('notes', '')
    apply_rule = request.form.get('apply_rule') == 'true'
    
    try:
        # Mettre à jour les valeurs de la dépense
        if category_id:
            expense.category_id = category_id
            expense.category_modified_by = ModificationSource.AUTO_RULE_CONFIRMED.value
        
        if flag_id:
            expense.flag_id = flag_id
            expense.flag_modified_by = ModificationSource.AUTO_RULE_CONFIRMED.value
            
        # Mettre à jour les notes
        if expense.notes != notes:
            expense.notes = notes
            expense.notes_modified_by = ModificationSource.AUTO_RULE_CONFIRMED.value
        
        # Si l'utilisateur a demandé d'appliquer la règle
        if apply_rule:
            # Enregistrer l'association avec la règle
            rule.affected_expenses.append(expense)
            
            # Supprimer l'application en attente
            db.session.delete(pending)
            
            flash('Règle appliquée avec les modifications.', 'success')
        else:
            # Juste sauvegarder les modifications sans appliquer la règle
            db.session.delete(pending)
            flash('Modifications sauvegardées, règle non appliquée.', 'info')
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la modification: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.pending_rules_list'))

@tricount_bp.route('/pending-rules/details/<int:pending_id>')
def get_pending_details(pending_id):
    """API pour récupérer les détails d'une application en attente"""
    pending = PendingRuleApplication.query.get_or_404(pending_id)
    
    # Récupérer la règle et la dépense
    rule = pending.rule
    expense = pending.expense
    
    # Préparer les données de la règle
    rule_data = {
        'id': rule.id,
        'name': rule.name,
        'merchant_contains': rule.merchant_contains,
        'description_contains': rule.description_contains,
        'category_id': rule.category_id,
        'flag_id': rule.flag_id,
        'apply_category': rule.apply_category,
        'apply_flag': rule.apply_flag,
        'apply_rename': rule.apply_rename
    }
    
    # Préparer les données de la dépense
    expense_data = {
        'id': expense.id,
        'date': expense.date.strftime('%d/%m/%Y'),
        'merchant': expense.merchant,
        'description': expense.description,
        'amount': float(expense.amount),
        'is_debit': expense.is_debit,
        'notes': expense.notes,
        'category_id': expense.category_id,
        'flag_id': expense.flag_id
    }
    
    return jsonify({
        'success': True,
        'rule': rule_data,
        'expense': expense_data
    })