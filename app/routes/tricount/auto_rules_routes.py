# app/routes/tricount/auto_rules_routes.py
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
    flags = Flag.query.all()  # Ajout des flags
    
    return render_template('tricount/auto_categorize.html',
                           expense=expense,
                           similar_expenses=similar_expenses,
                           categories=categories,
                           flags=flags)  # Passage des flags au template

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
            expense.flag_id = rule.flag_id  # Utiliser le flag_id au lieu de include_in_tricount/is_professional
            count += 1
    
    try:
        db.session.commit()
        flash(f'Règle appliquée avec succès à {count} dépenses.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de l\'application de la règle: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.auto_rules_list'))

@tricount_bp.route('/auto-rules/create', methods=['POST'])
def create_auto_rule():
    """Créer une nouvelle règle d'auto-catégorisation"""
    expense_id = request.form.get('expense_id', type=int)
    rule_name = request.form.get('rule_name')
    merchant_contains = request.form.get('merchant_contains')
    description_contains = request.form.get('description_contains')
    frequency_type = request.form.get('frequency_type')
    frequency_day = request.form.get('frequency_day', type=int)
    category_id = request.form.get('category_id', type=int)
    flag_id = request.form.get('flag_id', type=int)
    min_amount = request.form.get('min_amount', type=float)  # Nouveau
    max_amount = request.form.get('max_amount', type=float)  # Nouveau
    requires_confirmation = 'requires_confirmation' in request.form  # Nouveau
    apply_now = 'apply_now' in request.form
    
    if not rule_name or not merchant_contains or not category_id:
        flash('Le nom de la règle, le filtre de marchand et la catégorie sont requis.', 'warning')
        return redirect(url_for('tricount.auto_categorize', expense_id=expense_id))
    
    # Create rule with new fields
    rule = AutoCategorizationRule(
        name=rule_name,
        merchant_contains=merchant_contains,
        description_contains=description_contains,
        frequency_type=frequency_type if frequency_type != 'none' else None,
        frequency_day=frequency_day if frequency_type != 'none' else None,
        category_id=category_id,
        flag_id=flag_id,
        min_amount=min_amount,  # Nouveau
        max_amount=max_amount,  # Nouveau
        requires_confirmation=requires_confirmation,  # Nouveau
        created_by_expense_id=expense_id
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
    expense_id = request.json.get('expense_id')
    merchant_contains = request.json.get('merchant_contains')
    description_contains = request.json.get('description_contains')
    frequency_type = request.json.get('frequency_type')
    frequency_day = request.json.get('frequency_day')
    min_amount = request.json.get('min_amount')  # Nouveau
    max_amount = request.json.get('max_amount')  # Nouveau
    
    # Valider les données reçues
    if not expense_id or not merchant_contains:
        return jsonify({
            'success': False,
            'error': 'Paramètres manquants'
        }), 400
    
    # Récupérer l'expense de base
    base_expense = Expense.query.get_or_404(expense_id)
    
    # Rechercher des dépenses similaires non catégorisées
    query = Expense.query.filter(
        Expense.id != expense_id,
        Expense.category_id == None  # Non catégorisées
    )
    
    # Appliquer les filtres
    if merchant_contains:
        query = query.filter(Expense.merchant.ilike(f'%{merchant_contains}%'))
    
    if description_contains:
        query = query.filter(Expense.description.ilike(f'%{description_contains}%'))
    
    # Filtrer par montant minimum si spécifié (Nouveau)
    if min_amount is not None:
        query = query.filter(Expense.amount >= min_amount)
    
    # Filtrer par montant maximum si spécifié (Nouveau)
    if max_amount is not None:
        query = query.filter(Expense.amount <= max_amount)
    
    # Filtrer par fréquence si elle est spécifiée
    if frequency_type and frequency_type != 'none' and frequency_day is not None:
        if frequency_type == 'monthly':
            # Filtrer par jour du mois
            from sqlalchemy import extract
            query = query.filter(extract('day', Expense.date) == frequency_day)
        elif frequency_type == 'weekly':
            # Filtrer par jour de la semaine (0=lundi, 6=dimanche)
            from sqlalchemy import extract
            query = query.filter(extract('dow', Expense.date) == frequency_day)
    
    # Exécuter la requête
    similar_expenses = query.all()
    
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

@tricount_bp.route('/detect-frequency', methods=['POST'])
def detect_frequency():
    """API pour détecter automatiquement la fréquence d'une dépense"""
    expense_id = request.json.get('expense_id')
    merchant_contains = request.json.get('merchant_contains')
    
    if not expense_id or not merchant_contains:
        return jsonify({
            'success': False,
            'error': 'Paramètres manquants'
        }), 400
    
    # Récupérer l'expense de base
    base_expense = Expense.query.get_or_404(expense_id)
    
    # Trouver des dépenses similaires (y compris celles catégorisées)
    similar_expenses = Expense.query.filter(
        Expense.merchant.ilike(f'%{merchant_contains}%')
    ).all()
    
    # Détecter la fréquence avec le service
    frequency_info = AutoCategorizationService.detect_frequency(similar_expenses)
    
    return jsonify({
        'success': True,
        'frequency': frequency_info
    })