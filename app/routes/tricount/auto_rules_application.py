# app/routes/tricount/auto_rules_application.py
"""
Routes pour l'application des règles d'auto-catégorisation
Ce fichier gère l'application des règles aux dépenses
"""
from flask import render_template, redirect, url_for, flash, request, jsonify
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import (
    AutoCategorizationRule, Expense, Category, Flag, PendingRuleApplication, 
    ModificationSource
)
from app.services.tricount.auto_categorization import AutoCategorizationService
from app.utils.rename_helpers import apply_rule_rename
from app.utils.error_utils import handle_request_error
from datetime import datetime

@tricount_bp.route('/auto-categorize/<int:expense_id>')
def auto_categorize(expense_id):
    """Page pour créer une règle d'auto-catégorisation basée sur une dépense"""
    try:
        expense = Expense.query.get_or_404(expense_id)
        
        # Trouver des dépenses similaires
        similar_expenses = AutoCategorizationService.find_similar_expenses(expense)
        
        # Récupérer toutes les catégories ET les flags disponibles
        categories = Category.query.all()
        flags = Flag.query.all()
        
        return render_template('tricount/auto_categorize.html',
                            expense=expense,
                            similar_expenses=similar_expenses,
                            categories=categories,
                            flags=flags)
    except Exception as e:
        return handle_request_error("auto_categorize", e, redirect_url=url_for('tricount.expenses_list'))

@tricount_bp.route('/auto-rules/apply/<int:rule_id>', methods=['POST'])
def apply_auto_rule(rule_id):
    """Appliquer manuellement une règle d'auto-catégorisation"""
    try:
        rule = AutoCategorizationRule.query.get_or_404(rule_id)
        
        # Récupérer les dépenses sans catégorie
        uncategorized = Expense.query.filter_by(category_id=None).all()
        
        # Compter les dépenses affectées
        count = 0
        pending_count = 0
        
        for expense in uncategorized:
            if rule.matches_expense(expense):
                # Vérifier si cette règle nécessite une confirmation
                if rule.requires_confirmation:
                    # Vérifier si cette application n'existe pas déjà
                    existing = PendingRuleApplication.query.filter_by(
                        rule_id=rule.id, 
                        expense_id=expense.id
                    ).first()
                    
                    if not existing:
                        pending_application = PendingRuleApplication(
                            rule_id=rule.id,
                            expense_id=expense.id
                        )
                        db.session.add(pending_application)
                        pending_count += 1
                else:
                    # N'appliquer que les actions activées dans la règle
                    if rule.apply_category and rule.category_id:
                        expense.category_id = rule.category_id
                        expense.category_modified_by = ModificationSource.AUTO_RULE.value
                    
                    if rule.apply_flag and rule.flag_id:
                        expense.flag_id = rule.flag_id
                        expense.flag_modified_by = ModificationSource.AUTO_RULE.value
                        
                    if rule.apply_rename and rule.rename_pattern:
                        # Utiliser la fonction helper pour le renommage
                        apply_rule_rename(expense, rule)
                    
                    # Enregistrer la relation entre la règle et la dépense
                    rule.affected_expenses.append(expense)
                    count += 1
        
        db.session.commit()
        
        if rule.requires_confirmation and pending_count > 0:
            flash(f'{pending_count} dépenses ajoutées à la liste d\'attente pour confirmation.', 'info')
            flash(f'<a href="{url_for("tricount.pending_rules_list")}">Voir les dépenses en attente de confirmation</a>', 'info')
        elif rule.requires_confirmation and pending_count == 0:
            flash('Aucune dépense ne correspond aux critères de cette règle.', 'info')
        else:
            flash(f'Règle appliquée avec succès à {count} dépenses.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de l\'application de la règle: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.auto_rules_list'))

@tricount_bp.route('/create-auto-rule', methods=['POST'])
def create_auto_rule():
    """Créer une nouvelle règle d'auto-catégorisation"""
    try:
        expense_id = request.form.get('expense_id', type=int)
        rule_name = request.form.get('rule_name')
        merchant_contains = request.form.get('merchant_contains')
        description_contains = request.form.get('description_contains')
        
        # Options d'application
        apply_category = 'apply_category' in request.form
        apply_flag = 'apply_flag' in request.form
        apply_rename_merchant = 'apply_rename_merchant' in request.form
        apply_rename_description = 'apply_rename_description' in request.form
        
        # Destination de catégorisation
        category_id = request.form.get('category_id', type=int) if apply_category else None
        flag_id = request.form.get('flag_id', type=int) if apply_flag else None
        
        # Configuration de renommage du marchand
        rename_merchant_pattern = request.form.get('rename_merchant_pattern') if apply_rename_merchant else None
        rename_merchant_replacement = request.form.get('rename_merchant_replacement', '') if apply_rename_merchant else None
        
        # Configuration de modification de description
        rename_description_pattern = request.form.get('rename_description_pattern') if apply_rename_description else None
        rename_description_replacement = request.form.get('rename_description_replacement', '') if apply_rename_description else None
        
        # Autres options
        min_amount = request.form.get('min_amount', type=float)
        max_amount = request.form.get('max_amount', type=float)
        requires_confirmation = 'requires_confirmation' in request.form
        apply_now = 'apply_now' in request.form
        
        # Validation basique
        if not rule_name:
            flash('Le nom de la règle est requis.', 'warning')
            return redirect(url_for('tricount.auto_categorize', expense_id=expense_id))
        
        if not merchant_contains:
            flash('Le critère sur le marchand est requis.', 'warning')
            return redirect(url_for('tricount.auto_categorize', expense_id=expense_id))
        
        if apply_category and not category_id:
            flash('Une catégorie est requise si l\'option de catégorisation est activée.', 'warning')
            return redirect(url_for('tricount.auto_categorize', expense_id=expense_id))
        
        if apply_flag and not flag_id:
            flash('Un type de dépense est requis si l\'option de flag est activée.', 'warning')
            return redirect(url_for('tricount.auto_categorize', expense_id=expense_id))
        
        if apply_rename_merchant and not rename_merchant_pattern:
            flash('Un motif de renommage du marchand est requis si l\'option de renommage est activée.', 'warning')
            return redirect(url_for('tricount.auto_categorize', expense_id=expense_id))
        
        if apply_rename_description and not rename_description_pattern:
            flash('Un motif de modification de description est requis si l\'option est activée.', 'warning')
            return redirect(url_for('tricount.auto_categorize', expense_id=expense_id))
        
        # Créer la règle
        rule = AutoCategorizationRule(
            name=rule_name,
            merchant_contains=merchant_contains,
            description_contains=description_contains,
            category_id=category_id,
            flag_id=flag_id,
            min_amount=min_amount,
            max_amount=max_amount,
            requires_confirmation=requires_confirmation,
            created_by_expense_id=expense_id,
            # Paramètres d'action
            apply_category=apply_category,
            apply_flag=apply_flag,
            # Renommage du marchand
            apply_rename_merchant=apply_rename_merchant,
            rename_merchant_pattern=rename_merchant_pattern,
            rename_merchant_replacement=rename_merchant_replacement,
            # Modification de description
            apply_rename_description=apply_rename_description,
            rename_description_pattern=rename_description_pattern,
            rename_description_replacement=rename_description_replacement
        )
        
        db.session.add(rule)
        db.session.commit()
        flash(f'Règle "{rule_name}" créée avec succès.', 'success')
        
        # Appliquer immédiatement si demandé
        if apply_now:
            count = 0
            uncategorized = Expense.query.filter_by(category_id=None).all()
            
            for expense in uncategorized:
                if rule.matches_expense(expense):
                    # Appliquer les actions activées (respecter les modifications manuelles)
                    if apply_category and category_id:
                        if expense.category_modified_by != ModificationSource.MANUAL.value:
                            expense.category_id = category_id
                            expense.category_modified_by = ModificationSource.AUTO_RULE.value
                    
                    if apply_flag and flag_id:
                        if expense.flag_modified_by != ModificationSource.MANUAL.value:
                            expense.flag_id = flag_id
                            expense.flag_modified_by = ModificationSource.AUTO_RULE.value
                    
                    if apply_rename_merchant and rename_merchant_pattern:
                        if expense.merchant_modified_by != ModificationSource.MANUAL.value:
                            # Utiliser la fonction helper pour le renommage
                            apply_rule_rename(expense, rule, ModificationSource.AUTO_RULE.value)
                    
                    # Enregistrer la relation règle-dépense
                    rule.affected_expenses.append(expense)
                    count += 1
            
            db.session.commit()
            flash(f'Règle appliquée avec succès à {count} dépenses.', 'success')
        
        # Si la règle nécessite une confirmation, ajouter aux applications en attente
        elif requires_confirmation:
            pending_count = 0
            uncategorized = Expense.query.filter_by(category_id=None).all()
            
            for expense in uncategorized:
                if rule.matches_expense(expense):
                    # Vérifier si cette application n'existe pas déjà
                    existing = PendingRuleApplication.query.filter_by(
                        rule_id=rule.id, 
                        expense_id=expense.id
                    ).first()
                    
                    if not existing:
                        pending_application = PendingRuleApplication(
                            rule_id=rule.id,
                            expense_id=expense.id
                        )
                        db.session.add(pending_application)
                        pending_count += 1
            
            db.session.commit()
            if pending_count > 0:
                flash(f'{pending_count} dépenses ajoutées à la liste d\'attente pour confirmation.', 'info')
                # Ajouter un lien vers la page des règles en attente
                flash(f'<a href="{url_for("tricount.pending_rules_list")}">Voir les dépenses en attente de confirmation</a>', 'info')
            else:
                flash('Aucune dépense ne correspond aux critères de cette règle pour le moment.', 'info')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la création de la règle: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.auto_rules_list'))

@tricount_bp.route('/find-similar-expenses', methods=['POST'])
def find_similar_expenses():
    """API pour trouver des dépenses similaires selon les critères spécifiés"""
    try:
        data = request.json
        
        expense_id = data.get('expense_id')
        merchant_contains = data.get('merchant_contains', '')
        description_contains = data.get('description_contains', '')
        min_amount = data.get('min_amount')
        max_amount = data.get('max_amount')
        current_rule_id = data.get('current_rule_id')  # ID de la règle en cours d'édition
        
        # Mode spécial pour l'édition de règle (pas de dépense réelle)
        is_edit_mode = expense_id and int(expense_id) > 1000000  # Un ID très grand est probablement notre ID virtuel
        
        if not expense_id and not merchant_contains:
            return jsonify({
                'success': False,
                'error': 'Critères de recherche insuffisants'
            }), 400
        
        # En mode édition, on n'a pas besoin de récupérer une dépense de base
        if not is_edit_mode and not merchant_contains:
            base_expense = Expense.query.get(expense_id)
            if not base_expense:
                return jsonify({
                    'success': False,
                    'error': f'Dépense {expense_id} non trouvée'
                }), 404
            
            # Utiliser le marchand de la dépense si non spécifié
            if not merchant_contains:
                merchant_contains = base_expense.merchant
        
        # Rechercher des dépenses similaires
        # Point de départ de la requête
        if is_edit_mode or merchant_contains:
            query = Expense.query
        else:
            query = Expense.query.filter(Expense.id != expense_id)
        
        # Appliquer les filtres uniquement s'ils sont non vides
        if merchant_contains and merchant_contains.strip():
            # SIMPLIFICATION: Chercher uniquement dans merchant (nom original)
            query = query.filter(Expense.merchant.ilike(f'%{merchant_contains}%'))
        
        if description_contains and description_contains.strip():
            query = query.filter(Expense.description.ilike(f'%{description_contains}%'))
        
        # Filtrer par montant minimum si spécifié
        if min_amount is not None and min_amount != '':
            try:
                min_amount_float = float(min_amount)
                query = query.filter(Expense.amount >= min_amount_float)
            except (ValueError, TypeError):
                pass
        
        # Filtrer par montant maximum si spécifié
        if max_amount is not None and max_amount != '':
            try:
                max_amount_float = float(max_amount)
                query = query.filter(Expense.amount <= max_amount_float)
            except (ValueError, TypeError):
                pass
        
        # Exécuter la requête
        similar_expenses = query.all()
        
        # Préparer les données pour le JSON
        expenses_data = []
        for expense in similar_expenses:
            # Créer les données de base de la dépense
            expense_data = {
                'id': expense.id,
                'date': expense.date.strftime('%d/%m/%Y'),
                'merchant': expense.merchant,
                'renamed_merchant': expense.renamed_merchant,
                'amount': float(expense.amount),
                'is_debit': expense.is_debit,
                'description': expense.description
            }
            
            # Vérifier si la dépense a été renommée
            if expense.renamed_merchant:
                expense_data['original_merchant'] = expense.merchant
            
            # Vérifier si la dépense est déjà associée à une règle
            applied_rules = list(expense.applied_rules)
            if applied_rules:
                # Si on est en mode édition (current_rule_id fourni)
                if current_rule_id is not None:
                    # Vérifier si la règle associée est différente de celle en cours d'édition
                    if any(rule.id != int(current_rule_id) for rule in applied_rules):
                        # Trouver la première règle qui n'est pas celle en cours d'édition
                        conflict_rule = next((rule for rule in applied_rules if rule.id != int(current_rule_id)), None)
                        
                        if conflict_rule:
                            expense_data['conflict'] = {
                                'rule_id': conflict_rule.id,
                                'rule_name': conflict_rule.name
                            }
                    else:
                        # La dépense est associée uniquement à la règle en cours d'édition
                        expense_data['current_rule'] = True
                else:
                    # Mode création - tout simplement marquer comme conflit
                    applied_rule = applied_rules[0]
                    expense_data['conflict'] = {
                        'rule_id': applied_rule.id,
                        'rule_name': applied_rule.name
                    }
            
            expenses_data.append(expense_data)
        
        return jsonify({
            'success': True, 
            'count': len(similar_expenses),
            'expenses': expenses_data
        })
    
    except Exception as e:
        return handle_request_error("find_similar_expenses", e, is_ajax=True)