# app/routes/admin/errors_routes.py
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from app.extensions import db
from app.models.error_following import ErrorFollowing
from app.utils.auth_helpers import admin_required
from flask_login import login_required
from datetime import datetime
from sqlalchemy import desc

# Créer le blueprint pour l'administration des erreurs
errors_admin_bp = Blueprint('errors_admin', __name__, url_prefix='/admin/errors')

@errors_admin_bp.route('/')
@login_required
@admin_required
def errors_list():
    """Liste des erreurs enregistrées"""
    # Filtres
    error_type = request.args.get('type')
    resolved = request.args.get('resolved')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    search = request.args.get('search')
    
    # Création de la requête de base
    query = ErrorFollowing.query
    
    # Appliquer les filtres
    if error_type:
        query = query.filter(ErrorFollowing.error_type == error_type)
    
    if resolved is not None:
        is_resolved = resolved == '1'
        query = query.filter(ErrorFollowing.resolved == is_resolved)
    
    if start_date:
        try:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(ErrorFollowing.created_at >= start_date_obj)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(ErrorFollowing.created_at <= end_date_obj)
        except ValueError:
            pass
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (ErrorFollowing.source.ilike(search_term)) |
            (ErrorFollowing.message.ilike(search_term))
        )
    
    # Tri par date de création (plus récentes en premier)
    query = query.order_by(desc(ErrorFollowing.created_at))
    
    # Paginer les résultats
    page = request.args.get('page', 1, type=int)
    per_page = 20
    errors = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # Obtenir les types d'erreurs pour les filtres
    error_types = db.session.query(ErrorFollowing.error_type).distinct().all()
    error_types = [et[0] for et in error_types]
    
    return render_template('admin/errors_list.html',
                          errors=errors,
                          error_types=error_types,
                          selected_type=error_type,
                          selected_resolved=resolved,
                          start_date=start_date,
                          end_date=end_date,
                          search=search)

@errors_admin_bp.route('/<int:error_id>')
@login_required
@admin_required
def error_details(error_id):
    """Affiche les détails d'une erreur"""
    error = ErrorFollowing.query.get_or_404(error_id)
    return render_template('admin/error_details.html', error=error)

@errors_admin_bp.route('/<int:error_id>/resolve', methods=['POST'])
@login_required
@admin_required
def resolve_error(error_id):
    """Marquer une erreur comme résolue"""
    error = ErrorFollowing.query.get_or_404(error_id)
    
    # Marquer comme résolu ou non selon l'état actuel
    error.resolved = not error.resolved
    
    if error.resolved:
        error.resolved_at = datetime.utcnow()
    else:
        error.resolved_at = None
    
    db.session.commit()
    
    # Créer un message de flash approprié
    if error.resolved:
        flash(f'Erreur #{error.id} marquée comme résolue.', 'success')
    else:
        flash(f'Erreur #{error.id} marquée comme non résolue.', 'warning')
    
    # Rediriger vers la page précédente ou la liste
    next_page = request.args.get('next') or url_for('errors_admin.errors_list')
    return redirect(next_page)

@errors_admin_bp.route('/<int:error_id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_error(error_id):
    """Supprimer une erreur"""
    error = ErrorFollowing.query.get_or_404(error_id)
    
    try:
        db.session.delete(error)
        db.session.commit()
        flash(f'Erreur #{error_id} supprimée avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la suppression: {str(e)}', 'danger')
    
    # Rediriger vers la liste des erreurs
    return redirect(url_for('errors_admin.errors_list'))

@errors_admin_bp.route('/stats')
@login_required
@admin_required
def error_stats():
    """Affiche des statistiques sur les erreurs"""
    # Nombre total d'erreurs
    total_errors = ErrorFollowing.query.count()
    
    # Nombre d'erreurs non résolues
    unresolved_errors = ErrorFollowing.query.filter_by(resolved=False).count()
    
    # Nombre d'erreurs par type
    error_type_counts = db.session.query(
        ErrorFollowing.error_type,
        db.func.count(ErrorFollowing.id)
    ).group_by(ErrorFollowing.error_type).all()
    
    # Nombre d'erreurs par jour (30 derniers jours)
    errors_by_day = db.session.query(
        db.func.date(ErrorFollowing.created_at),
        db.func.count(ErrorFollowing.id)
    ).group_by(db.func.date(ErrorFollowing.created_at)).order_by(db.func.date(ErrorFollowing.created_at).desc()).limit(30).all()
    
    # Inverser pour un ordre chronologique
    errors_by_day.reverse()
    
    # Sources les plus fréquentes (top 10)
    top_sources = db.session.query(
        ErrorFollowing.source,
        db.func.count(ErrorFollowing.id)
    ).group_by(ErrorFollowing.source).order_by(db.func.count(ErrorFollowing.id).desc()).limit(10).all()
    
    return render_template('admin/error_stats.html',
                          total_errors=total_errors,
                          unresolved_errors=unresolved_errors,
                          error_type_counts=error_type_counts,
                          errors_by_day=errors_by_day,
                          top_sources=top_sources)

@errors_admin_bp.route('/bulk-resolve', methods=['POST'])
@login_required
@admin_required
def bulk_resolve():
    """Résoudre plusieurs erreurs en masse"""
    # Récupérer les IDs des erreurs à résoudre
    error_ids = request.form.getlist('error_ids')
    action = request.form.get('action')
    
    if not error_ids or not action:
        flash('Aucune erreur sélectionnée ou action non spécifiée.', 'warning')
        return redirect(url_for('errors_admin.errors_list'))
    
    try:
        # Déterminer l'action à effectuer
        if action == 'resolve':
            # Marquer comme résolues
            ErrorFollowing.query.filter(ErrorFollowing.id.in_(error_ids)).update(
                {
                    ErrorFollowing.resolved: True,
                    ErrorFollowing.resolved_at: datetime.utcnow()
                },
                synchronize_session=False
            )
            flash(f'{len(error_ids)} erreurs marquées comme résolues.', 'success')
        
        elif action == 'unresolve':
            # Marquer comme non résolues
            ErrorFollowing.query.filter(ErrorFollowing.id.in_(error_ids)).update(
                {
                    ErrorFollowing.resolved: False,
                    ErrorFollowing.resolved_at: None
                },
                synchronize_session=False
            )
            flash(f'{len(error_ids)} erreurs marquées comme non résolues.', 'success')
        
        elif action == 'delete':
            # Supprimer les erreurs
            ErrorFollowing.query.filter(ErrorFollowing.id.in_(error_ids)).delete(synchronize_session=False)
            flash(f'{len(error_ids)} erreurs supprimées.', 'success')
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors du traitement en masse: {str(e)}', 'danger')
    
    return redirect(url_for('errors_admin.errors_list'))