# app/routes/tricount/auto_rules_management.py
"""
Routes pour la gestion des règles d'auto-catégorisation
Ce fichier gère la création, modification et suppression des règles
"""
from flask import render_template, redirect, url_for, flash, request, jsonify
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import (
    AutoCategorizationRule, Expense, Category, Flag, PendingRuleApplication, 
    ModificationSource
)
from app.utils.error_utils import handle_request_error
from datetime import datetime

@tricount_bp.route('/auto-rules')
def auto_rules_list():
    """Liste des règles d'auto-catégorisation"""
    rules = AutoCategorizationRule.query.all()
    return render_template('tricount/auto_rules.html', rules=rules)

@tricount_bp.route('/auto-rules/delete/<int:rule_id>', methods=['POST'])
def delete_auto_rule(rule_id):
    """Supprimer une règle d'auto-catégorisation"""
    try:
        rule = AutoCategorizationRule.query.get_or_404(rule_id)
        
        db.session.delete(rule)
        db.session.commit()
        flash(f'Règle "{rule.name}" supprimée avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la suppression de la règle: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.auto_rules_list'))

@tricount_bp.route('/auto-rules/edit/<int:rule_id>', methods=['GET', 'POST'])
def edit_auto_rule(rule_id):
    """Page pour éditer une règle d'auto-catégorisation existante"""
    # Récupérer la règle
    rule = AutoCategorizationRule.query.get_or_404(rule_id)
    
    if request.method == 'POST':
        try:
            # Traiter le formulaire d'édition
            rule.name = request.form.get('rule_name')
            rule.merchant_contains = request.form.get('merchant_contains')
            rule.description_contains = request.form.get('description_contains')
            
            # Mise à jour des options d'action
            rule.apply_category = 'apply_category' in request.form
            rule.apply_flag = 'apply_flag' in request.form
            
            # Nouvelle option: Renommage du marchand
            rule.apply_rename_merchant = 'apply_rename_merchant' in request.form
            rule.rename_merchant_pattern = request.form.get('rename_merchant_pattern')
            rule.rename_merchant_replacement = request.form.get('rename_merchant_replacement', '')
            
            # Nouvelle option: Modification de la description
            rule.apply_rename_description = 'apply_rename_description' in request.form
            rule.rename_description_pattern = request.form.get('rename_description_pattern')
            rule.rename_description_replacement = request.form.get('rename_description_replacement', '')
            
            # Conserver pour la compatibilité avec l'ancien système
            rule.apply_rename = 'apply_rename' in request.form or rule.apply_rename_merchant
            rule.rename_pattern = request.form.get('rename_pattern') or rule.rename_merchant_pattern
            rule.rename_replacement = request.form.get('rename_replacement') or rule.rename_merchant_replacement
            
            # Mise à jour des cibles d'action
            if rule.apply_category:
                rule.category_id = request.form.get('category_id', type=int)
            
            if rule.apply_flag:
                rule.flag_id = request.form.get('flag_id', type=int)
            
            # Autres options
            rule.min_amount = request.form.get('min_amount', type=float)
            rule.max_amount = request.form.get('max_amount', type=float)
            rule.requires_confirmation = 'requires_confirmation' in request.form
            
            db.session.commit()
            flash(f'Règle "{rule.name}" mise à jour avec succès.', 'success')
            return redirect(url_for('tricount.auto_rules_list'))
        except Exception as e:
            db.session.rollback()
            flash(f'Erreur lors de la mise à jour de la règle: {str(e)}', 'danger')
    
    # Récupérer toutes les catégories et flags pour le formulaire
    categories = Category.query.all()
    flags = Flag.query.all()
    
    # Exemple de marchand pour la prévisualisation du renommage
    example_merchant = rule.merchant_contains
    
    # ID unique pour cette requête (pour le JavaScript)
    virtual_expense_id = abs(hash(rule.merchant_contains + str(datetime.utcnow().timestamp())))
    
    return render_template('tricount/edit_auto_rule.html',
                           rule=rule,
                           categories=categories,
                           flags=flags,
                           example_merchant=example_merchant,
                           virtual_expense_id=virtual_expense_id)

@tricount_bp.route('/rule-details/<int:rule_id>')
def get_rule_details(rule_id):
    """API pour récupérer les détails d'une règle d'auto-catégorisation"""
    try:
        rule = AutoCategorizationRule.query.get_or_404(rule_id)
        expense_id = request.args.get('expense_id', type=int)
        
        # Informations de base sur la règle
        rule_data = {
            'id': rule.id,
            'name': rule.name,
            'merchant_contains': rule.merchant_contains,
            'description_contains': rule.description_contains,
            'min_amount': float(rule.min_amount) if rule.min_amount else None,
            'max_amount': float(rule.max_amount) if rule.max_amount else None,
            'apply_category': rule.apply_category,
            'apply_flag': rule.apply_flag,
            'apply_rename': rule.apply_rename,
            'category_name': rule.category.name if rule.category else None,
            'flag_name': rule.flag.name if rule.flag else None,
            'rename_pattern': rule.rename_pattern,
            'rename_replacement': rule.rename_replacement
        }
        
        # Si un expense_id est fourni, vérifier si cette dépense est affectée par la règle
        affected_expense = None
        if expense_id:
            expense = Expense.query.get(expense_id)
            if expense and rule.matches_expense(expense):
                affected_expense = {
                    'id': expense.id,
                    'date': expense.date.strftime('%d/%m/%Y'),
                    'merchant': expense.merchant,
                    'amount': float(expense.amount),
                    'is_debit': expense.is_debit
                }
        
        return jsonify({
            'success': True,
            'rule': rule_data,
            'affected_expense': affected_expense
        })
    except Exception as e:
        return handle_request_error("get_rule_details", e, is_ajax=True)

@tricount_bp.route('/expense-rule-conflict/<int:expense_id>')
def expense_rule_conflict(expense_id):
    """API pour récupérer les informations sur les règles qui affectent une dépense"""
    try:
        expense = Expense.query.get_or_404(expense_id)
        
        # Récupérer la première règle appliquée
        rule = expense.applied_rules.first()
        
        if not rule:
            return jsonify({
                'success': False,
                'error': 'Aucune règle trouvée pour cette dépense'
            })
        
        # Formater les données de la règle
        rule_data = {
            'id': rule.id,
            'name': rule.name,
            'merchant_contains': rule.merchant_contains,
            'description_contains': rule.description_contains,
            'apply_category': rule.apply_category,
            'apply_flag': rule.apply_flag,
            'apply_rename': rule.apply_rename,
            'category_name': rule.category.name if rule.category else None,
            'flag_name': rule.flag.name if rule.flag else None,
            'rename_pattern': rule.rename_pattern,
            'rename_replacement': rule.rename_replacement
        }
        
        return jsonify({
            'success': True,
            'rule': rule_data
        })
    except Exception as e:
        return handle_request_error("expense_rule_conflict", e, is_ajax=True)

@tricount_bp.route('/check-rule-conflicts', methods=['POST'])
def check_rule_conflicts():
    """API pour vérifier si une règle entrerait en conflit avec des règles existantes"""
    try:
        data = request.json
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Aucune donnée reçue'
            }), 400
        
        # Extraire les données pour le test de conflit
        merchant_contains = data.get('merchant_contains', '')
        description_contains = data.get('description_contains', '')
        min_amount = data.get('min_amount')
        max_amount = data.get('max_amount')
        expense_id = data.get('expense_id')
        
        # Récupérer l'ID de la règle en cours d'édition s'il existe
        current_rule_id = data.get('current_rule_id')
        
        # Créer une règle temporaire pour tester les conflits
        temp_rule = AutoCategorizationRule(
            name="Règle temporaire",
            merchant_contains=merchant_contains,
            description_contains=description_contains,
            min_amount=min_amount,
            max_amount=max_amount
        )
        
        # Trouver toutes les dépenses correspondant à ces critères
        query = Expense.query
        
        if merchant_contains:
            # Simplification: Chercher uniquement dans merchant (nom original)
            query = query.filter(Expense.merchant.ilike(f'%{merchant_contains}%'))
        
        if description_contains:
            query = query.filter(Expense.description.ilike(f'%{description_contains}%'))
        
        if min_amount is not None:
            query = query.filter(Expense.amount >= min_amount)
        
        if max_amount is not None:
            query = query.filter(Expense.amount <= max_amount)
        
        matching_expenses = query.all()
        
        # Chercher les règles qui affectent déjà ces dépenses
        conflicts = {}
        
        for expense in matching_expenses:
            # Vérifier si la règle temporaire correspond à cette dépense
            if temp_rule.matches_expense(expense):
                # Vérifier les règles existantes qui affectent cette dépense
                for rule in expense.applied_rules:
                    # Ignorer la règle en cours d'édition si on est en mode édition
                    if current_rule_id and rule.id == int(current_rule_id):
                        continue
                        
                    # Ajouter au dictionnaire des conflits
                    if rule.id not in conflicts:
                        conflicts[rule.id] = {
                            'rule': {
                                'id': rule.id,
                                'name': rule.name,
                                'merchant_contains': rule.merchant_contains,
                                'apply_category': rule.apply_category,
                                'category_name': rule.category.name if rule.category else None,
                                'apply_flag': rule.apply_flag,
                                'flag_name': rule.flag.name if rule.flag else None
                            },
                            'expenses': []
                        }
                    
                    # Ajouter la dépense au conflit
                    expense_data = {
                        'id': expense.id,
                        'date': expense.date.strftime('%d/%m/%Y'),
                        'merchant': expense.merchant,
                        'amount': float(expense.amount),
                        'is_debit': expense.is_debit
                    }
                    
                    # Éviter les doublons
                    if not any(e['id'] == expense_data['id'] for e in conflicts[rule.id]['expenses']):
                        conflicts[rule.id]['expenses'].append(expense_data)
        
        # Convertir le dictionnaire en liste
        conflict_list = list(conflicts.values())
        
        return jsonify({
            'success': True,
            'has_conflicts': len(conflict_list) > 0,
            'conflicts': conflict_list
        })
    except Exception as e:
        return handle_request_error("check_rule_conflicts", e, is_ajax=True)