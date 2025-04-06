# app/routes/tricount/auto_rules_routes.py - version sans fréquence

from flask import render_template, redirect, url_for, flash, request, jsonify
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import AutoCategorizationRule, Expense, Category, Flag
from app.services.tricount.auto_categorization import AutoCategorizationService

@tricount_bp.route('/auto-rules')
def auto_rules_list():
    """Liste des règles d'auto-catégorisation"""
    rules = AutoCategorizationRule.query.all()
    return render_template('tricount/auto_rules.html', rules=rules)

@tricount_bp.route('/auto-rules/delete/<int:rule_id>', methods=['POST'])
def delete_auto_rule(rule_id):
    """Supprimer une règle d'auto-catégorisation"""
    rule = AutoCategorizationRule.query.get_or_404(rule_id)
    
    try:
        db.session.delete(rule)
        db.session.commit()
        flash(f'Règle "{rule.name}" supprimée avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la suppression de la règle: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.auto_rules_list'))

@tricount_bp.route('/auto-categorize/<int:expense_id>')
def auto_categorize(expense_id):
    """Page pour créer une règle d'auto-catégorisation basée sur une dépense"""
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

@tricount_bp.route('/auto-rules/apply/<int:rule_id>', methods=['POST'])
def apply_auto_rule(rule_id):
    """Appliquer manuellement une règle d'auto-catégorisation"""
    rule = AutoCategorizationRule.query.get_or_404(rule_id)
    
    # Récupérer les dépenses sans catégorie
    uncategorized = Expense.query.filter_by(category_id=None).all()
    
    # Compter les dépenses affectées
    count = 0
    
    for expense in uncategorized:
        if rule.matches_expense(expense):
            expense.category_id = rule.category_id
            expense.flag_id = rule.flag_id
            count += 1
    
    try:
        db.session.commit()
        flash(f'Règle appliquée avec succès à {count} dépenses.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de l\'application de la règle: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.auto_rules_list'))

@tricount_bp.route('/create-auto-rule', methods=['POST'])
def create_auto_rule():
    """Créer une nouvelle règle d'auto-catégorisation"""
    expense_id = request.form.get('expense_id', type=int)
    rule_name = request.form.get('rule_name')
    merchant_contains = request.form.get('merchant_contains')
    description_contains = request.form.get('description_contains')
    frequency_type = request.form.get('frequency_type')
    frequency_day = request.form.get('frequency_day', type=int)
    
    # Options d'application
    apply_category = 'apply_category' in request.form
    apply_flag = 'apply_flag' in request.form
    apply_rename = 'apply_rename' in request.form
    
    # Destination de catégorisation
    category_id = request.form.get('category_id', type=int) if apply_category else None
    flag_id = request.form.get('flag_id', type=int) if apply_flag else None
    
    # Configuration de renommage
    rename_pattern = request.form.get('rename_pattern') if apply_rename else None
    rename_replacement = request.form.get('rename_replacement', '') if apply_rename else None
    
    # Autres options
    min_amount = request.form.get('min_amount', type=float)
    max_amount = request.form.get('max_amount', type=float)
    requires_confirmation = 'requires_confirmation' in request.form
    apply_now = 'apply_now' in request.form
    
    # Validation de base
    if not rule_name or not merchant_contains:
        flash('Le nom de la règle et le filtre de marchand sont requis.', 'warning')
        return redirect(url_for('tricount.auto_categorize', expense_id=expense_id))
    
    # Validation des options d'application
    if not apply_category and not apply_flag and not apply_rename:
        flash('Vous devez activer au moins une action (catégorie, type ou renommage).', 'warning')
        return redirect(url_for('tricount.auto_categorize', expense_id=expense_id))
    
    # Validation spécifique par type d'action
    if apply_category and not category_id:
        flash('Une catégorie doit être sélectionnée si l\'option de catégorisation est activée.', 'warning')
        return redirect(url_for('tricount.auto_categorize', expense_id=expense_id))
    
    if apply_flag and not flag_id:
        flash('Un type de dépense doit être sélectionné si l\'option de type est activée.', 'warning')
        return redirect(url_for('tricount.auto_categorize', expense_id=expense_id))
    
    if apply_rename and not rename_pattern:
        flash('Un motif de recherche doit être spécifié si l\'option de renommage est activée.', 'warning')
        return redirect(url_for('tricount.auto_categorize', expense_id=expense_id))
    
    # Créer la règle
    rule = AutoCategorizationRule(
        name=rule_name,
        merchant_contains=merchant_contains,
        description_contains=description_contains,
        frequency_type=frequency_type if frequency_type != 'none' else None,
        frequency_day=frequency_day if frequency_type != 'none' else None,
        category_id=category_id,
        flag_id=flag_id,
        min_amount=min_amount,
        max_amount=max_amount,
        requires_confirmation=requires_confirmation,
        created_by_expense_id=expense_id,
        # Nouveaux champs
        apply_category=apply_category,
        apply_flag=apply_flag,
        apply_rename=apply_rename,
        rename_pattern=rename_pattern,
        rename_replacement=rename_replacement
    )
    
    db.session.add(rule)
    
    try:
        db.session.commit()
        flash(f'Règle "{rule_name}" créée avec succès.', 'success')
        
        # Appliquer immédiatement si demandé
        if apply_now:
            count = 0
            uncategorized = Expense.query.filter_by(category_id=None).all()
            
            for expense in uncategorized:
                if rule.matches_expense(expense):
                    expense.category_id = rule.category_id
                    expense.flag_id = rule.flag_id
                    count += 1
            
            db.session.commit()
            flash(f'Règle appliquée avec succès à {count} dépenses.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la création de la règle: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.auto_rules_list'))

@tricount_bp.route('/find-similar-expenses', methods=['POST'])
def find_similar_expenses():
    """API pour trouver des dépenses similaires selon les critères spécifiés"""
    data = request.json
    print(f"Données reçues dans la requête: {data}")
    
    expense_id = data.get('expense_id')
    merchant_contains = data.get('merchant_contains', '')
    description_contains = data.get('description_contains', '')
    min_amount = data.get('min_amount')
    max_amount = data.get('max_amount')
    
    # Valider les données essentielles
    if not expense_id:
        print("Erreur: ID de dépense manquant")
        return jsonify({
            'success': False,
            'error': 'ID de dépense manquant'
        }), 400
    
    # Récupérer l'expense de base
    try:
        base_expense = Expense.query.get(expense_id)
        if not base_expense:
            print(f"Erreur: Dépense {expense_id} non trouvée")
            return jsonify({
                'success': False,
                'error': f'Dépense {expense_id} non trouvée'
            }), 404
    except Exception as e:
        print(f"Erreur lors de la récupération de la dépense: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erreur lors de la récupération de la dépense: {str(e)}'
        }), 500
    
    # Rechercher des dépenses similaires non catégorisées
    try:
        query = Expense.query.filter(
            Expense.id != expense_id,
            Expense.category_id == None  # Non catégorisées
        )
        
        print(f"Filtres appliqués: merchant_contains='{merchant_contains}', "
              f"description_contains='{description_contains}', "
              f"min_amount={min_amount}, max_amount={max_amount}")
        
        # Appliquer les filtres uniquement s'ils sont non vides
        if merchant_contains and merchant_contains.strip():
            query = query.filter(Expense.merchant.ilike(f'%{merchant_contains}%'))
        
        if description_contains and description_contains.strip():
            query = query.filter(Expense.description.ilike(f'%{description_contains}%'))
        
        # Filtrer par montant minimum si spécifié
        if min_amount is not None and min_amount != '':
            try:
                min_amount_float = float(min_amount)
                query = query.filter(Expense.amount >= min_amount_float)
            except (ValueError, TypeError):
                print(f"Avertissement: Valeur min_amount invalide '{min_amount}'")
        
        # Filtrer par montant maximum si spécifié
        if max_amount is not None and max_amount != '':
            try:
                max_amount_float = float(max_amount)
                query = query.filter(Expense.amount <= max_amount_float)
            except (ValueError, TypeError):
                print(f"Avertissement: Valeur max_amount invalide '{max_amount}'")
        
        # Exécuter la requête
        similar_expenses = query.all()
        print(f"Nombre de dépenses trouvées: {len(similar_expenses)}")
        
        # Préparer les données pour le JSON
        expenses_data = []
        for expense in similar_expenses:
            expenses_data.append({
                'id': expense.id,
                'date': expense.date.strftime('%d/%m/%Y'),
                'merchant': expense.merchant,
                'amount': float(expense.amount),
                'is_debit': expense.is_debit,
                'description': expense.description
            })
        
        return jsonify({
            'success': True, 
            'count': len(similar_expenses),
            'expenses': expenses_data
        })
    
    except Exception as e:
        print(f"Erreur lors de la recherche des dépenses similaires: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erreur lors de la recherche des dépenses similaires: {str(e)}'
        }), 500

@tricount_bp.route('/check-rule-conflicts', methods=['POST'])
def check_rule_conflicts():
    """Vérifie si une règle d'auto-catégorisation entrerait en conflit avec des règles existantes"""
    rule_data = request.json
    expense_id = rule_data.get('expense_id')
    
    conflicts = AutoCategorizationService.find_conflicting_rules(rule_data, expense_id)
    
    # Préparer les données de conflit pour la réponse JSON
    conflict_data = []
    for conflict in conflicts:
        rule = conflict['rule']
        expenses = conflict['expenses']
        expenses_data = []
        
        for expense in expenses:
            expenses_data.append({
                'id': expense.id,
                'date': expense.date.strftime('%d/%m/%Y'),
                'merchant': expense.merchant,
                'amount': float(expense.amount),
                'is_debit': expense.is_debit
            })
        
        conflict_data.append({
            'rule': {
                'id': rule.id,
                'name': rule.name,
                'merchant_contains': rule.merchant_contains,
                'description_contains': rule.description_contains,
                'min_amount': float(rule.min_amount) if rule.min_amount else None,
                'max_amount': float(rule.max_amount) if rule.max_amount else None,
                'category_id': rule.category_id,
                'category_name': rule.category.name if rule.category else None,
                'flag_id': rule.flag_id,
                'flag_name': rule.flag.name if rule.flag else None
            },
            'expenses': expenses_data
        })
    
    return jsonify({
        'success': True,
        'conflicts': conflict_data,
        'has_conflicts': len(conflict_data) > 0
    })

@tricount_bp.route('/auto-rules/edit/<int:rule_id>', methods=['GET', 'POST'])
def edit_auto_rule(rule_id):
    """Page pour éditer une règle d'auto-catégorisation existante"""
    # Récupérer la règle
    rule = AutoCategorizationRule.query.get_or_404(rule_id)
    
    if request.method == 'POST':
        # Traiter le formulaire d'édition
        rule.name = request.form.get('rule_name')
        rule.merchant_contains = request.form.get('merchant_contains')
        rule.description_contains = request.form.get('description_contains')
        rule.category_id = request.form.get('category_id', type=int)
        rule.flag_id = request.form.get('flag_id', type=int)
        rule.min_amount = request.form.get('min_amount', type=float)
        rule.max_amount = request.form.get('max_amount', type=float)
        rule.requires_confirmation = 'requires_confirmation' in request.form
        
        try:
            db.session.commit()
            flash(f'Règle "{rule.name}" mise à jour avec succès.', 'success')
            return redirect(url_for('tricount.auto_rules_list'))
        except Exception as e:
            db.session.rollback()
            flash(f'Erreur lors de la mise à jour de la règle: {str(e)}', 'danger')
    
    # Récupérer toutes les catégories et flags pour le formulaire
    categories = Category.query.all()
    flags = Flag.query.all()
    
    return render_template('tricount/edit_auto_rule.html',
                          rule=rule,
                          categories=categories,
                          flags=flags)

@tricount_bp.route('/expense-rule-conflict/<int:expense_id>')
def expense_rule_conflict(expense_id):
    """API pour récupérer les informations sur les règles qui affectent une dépense"""
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