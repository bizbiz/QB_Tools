// app/static/js/tricount/reimbursements/ui.js
/**
 * Fonctions d'interface utilisateur pour le module de remboursements
 */

import { initTooltips } from './core.js';
import { initStatusSwitches } from './status.js';
import { initBulkSelection } from './bulk.js';
import { initAjaxPagination } from './filters.js';
import { initExpenseManagement } from './expenses.js';

/**
 * Initialise les fonctionnalités d'interface
 */
export function initUI() {
    // Des fonctionnalités supplémentaires d'interface pourraient être ajoutées ici
}

/**
 * Met à jour le contenu du tableau avec les nouvelles dépenses
 * @param {Array} expenses - Liste des dépenses
 */
export function updateTableContent(expenses) {
    const tableBody = document.getElementById('expenses-table-body');
    
    if (!tableBody) return;
    
    // Vider le contenu actuel
    tableBody.innerHTML = '';
    
    // Mettre à jour le compteur de dépenses
    const expenseCount = document.getElementById('expenses-count');
    if (expenseCount) {
        expenseCount.textContent = `${expenses.length} dépenses`;
    }
    
    // Ajouter les nouvelles lignes
    if (expenses.length === 0) {
        // Aucune dépense à afficher
        tableBody.innerHTML = `
            <tr id="no-expenses-row">
                <td colspan="8" class="text-center py-4">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle me-2"></i>
                        Aucune dépense remboursable trouvée avec les filtres appliqués. 
                        <a href="#" class="reset-filters-link">Réinitialiser les filtres</a>.
                    </div>
                </td>
            </tr>
        `;
        
        // Initialiser le lien de réinitialisation
        const resetLink = tableBody.querySelector('.reset-filters-link');
        if (resetLink) {
            resetLink.addEventListener('click', function(e) {
                e.preventDefault();
                window.resetFilters();
            });
        }
        
        return;
    }
    
    // Créer les lignes pour chaque dépense
    expenses.forEach(expense => {
        // Déterminer si la dépense est non remboursable
        const isNotReimbursable = expense.is_reimbursable === false;
        
        // Préparer les classes de la ligne
        const rowClasses = [];
        if (expense.is_declared) rowClasses.push('expense-declared');
        if (expense.is_reimbursed) rowClasses.push('expense-reimbursed');
        if (isNotReimbursable) rowClasses.push('expense-not-reimbursable');
        
        // Construire HTML de la ligne avec des attributs de tri explicites
        const row = document.createElement('tr');
        row.dataset.expenseId = expense.id;
        row.className = rowClasses.join(' ');
        
        // Contenu HTML de la ligne
        row.innerHTML = `
            <td>
                <div class="form-check">
                    <input class="form-check-input expense-checkbox" type="checkbox" value="${expense.id}"
                           ${isNotReimbursable ? 'disabled' : ''}>
                </div>
            </td>
            <td data-sort-value="${expense.date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3$2$1')}">
                ${expense.date}
            </td>
            <td class="description-cell" data-sort-value="${expense.merchant.toLowerCase()}">
                <div class="fw-bold">${expense.merchant}</div>
                <div class="small text-muted">${expense.description || ''}</div>
            </td>
            <td class="text-danger" data-sort-value="${parseFloat(expense.amount).toFixed(2)}">
                ${parseFloat(expense.amount).toFixed(2)} €
            </td>
            <td data-sort-value="${expense.flag ? expense.flag.name.toLowerCase() : 'zzz'}">
                ${expense.flag_html || '<span class="badge bg-secondary">Non défini</span>'}
            </td>
            <td data-sort-value="${expense.is_declared ? '1' : '0'}">
                <div class="form-check form-switch">
                    <input class="form-check-input status-switch declared-switch" 
                           type="checkbox" 
                           data-expense-id="${expense.id}" 
                           data-status="declared" 
                           ${expense.is_declared ? 'checked' : ''}
                           ${isNotReimbursable ? 'disabled' : ''}>
                    <label class="form-check-label">Déclarée</label>
                    ${isNotReimbursable ? 
                      `<i class="fas fa-info-circle text-muted ms-1" 
                          data-bs-toggle="tooltip" 
                          title="Cette dépense n'est pas remboursable">
                       </i>` : ''}
                </div>
            </td>
            <td data-sort-value="${expense.is_reimbursed ? '1' : '0'}">
                <div class="form-check form-switch">
                    <input class="form-check-input status-switch reimbursed-switch" 
                           type="checkbox" 
                           data-expense-id="${expense.id}" 
                           data-status="reimbursed" 
                           ${expense.is_reimbursed ? 'checked' : ''}
                           ${isNotReimbursable ? 'disabled' : ''}>
                    <label class="form-check-label">Remboursée</label>
                    ${isNotReimbursable ? 
                      `<i class="fas fa-info-circle text-muted ms-1" 
                          data-bs-toggle="tooltip" 
                          title="Cette dépense n'est pas remboursable">
                       </i>` : ''}
                </div>
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-primary edit-expense-btn" 
                        data-expense-id="${expense.id}" 
                        title="Modifier cette dépense">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-info view-expense-btn" 
                        data-expense-id="${expense.id}" 
                        title="Voir les détails">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Réinitialiser les fonctionnalités des boutons et sélecteurs
    initStatusSwitches();
    initBulkSelection();
    initTooltips();
    initExpenseManagement();
    
    // Réinitialiser le tri des tableaux (simplifier pour éviter les problèmes)
    if (window.TableSorter && typeof window.TableSorter.init === 'function') {
        setTimeout(() => window.TableSorter.init(), 0);
    }
}

/**
 * Met à jour les statistiques du résumé
 * @param {Object} summary - Données de résumé
 */
export function updateSummary(summary) {
    const totalAmount = document.getElementById('total-amount');
    const totalDeclared = document.getElementById('total-declared');
    const totalReimbursed = document.getElementById('total-reimbursed');
    const percentageDeclared = document.getElementById('percentage-declared');
    const progressCircle = document.getElementById('progress-circle-bg');
    
    if (totalAmount) totalAmount.textContent = `${summary.total_amount.toFixed(2)} €`;
    if (totalDeclared) totalDeclared.textContent = `${summary.total_declared.toFixed(2)} €`;
    if (totalReimbursed) totalReimbursed.textContent = `${summary.total_reimbursed.toFixed(2)} €`;
    if (percentageDeclared) percentageDeclared.textContent = `${Math.round(summary.percentage_declared)}%`;
    
    // Mettre à jour le cercle de progression
    if (progressCircle) {
        progressCircle.style.background = 
            `conic-gradient(#0d6efd ${summary.percentage_declared}%, #e9ecef 0)`;
    }
}

/**
 * Met à jour la pagination
 * @param {Object} pagination - Données de pagination
 */
export function updatePagination(pagination) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    // Si pas de pages, masquer la pagination
    if (pagination.pages <= 1) {
        const paginationParent = document.getElementById('pagination-container');
        if (paginationParent) {
            paginationParent.innerHTML = '';
        }
        return;
    }
    
    // Générer le HTML de pagination
    let html = '';
    
    // Bouton précédent
    if (pagination.has_prev) {
        html += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="${pagination.page - 1}">
                    <i class="fas fa-chevron-left"></i> Précédent
                </a>
            </li>
        `;
    } else {
        html += `
            <li class="page-item disabled">
                <span class="page-link"><i class="fas fa-chevron-left"></i> Précédent</span>
            </li>
        `;
    }
    
    // Calculer les pages à afficher
    let startPage = Math.max(pagination.page - 2, 1);
    let endPage = Math.min(startPage + 4, pagination.pages);
    startPage = Math.max(endPage - 4, 1);
    
    // Pages numérotées
    for (let i = startPage; i <= endPage; i++) {
        if (i === pagination.page) {
            html += `
                <li class="page-item active">
                    <span class="page-link">${i}</span>
                </li>
            `;
        } else {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
    }
    
    // Bouton suivant
    if (pagination.has_next) {
        html += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="${pagination.page + 1}">
                    Suivant <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
    } else {
        html += `
            <li class="page-item disabled">
                <span class="page-link">Suivant <i class="fas fa-chevron-right"></i></span>
            </li>
        `;
    }
    
    // Mettre à jour le HTML
    paginationContainer.innerHTML = html;
    
    // Initialiser les liens de pagination
    initAjaxPagination();
}

/**
 * Récupère et met à jour les statistiques de résumé
 */
export function fetchAndUpdateSummary() {
    // Récupérer les filtres actuels y compris show_all
    const filterForm = document.getElementById('filter-form');
    const formData = new FormData(filterForm);
    
    fetch('/tricount/reimbursements/summary', {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateSummary(data.summary);
        }
    })
    .catch(error => {
        console.error('Erreur lors de la récupération des statistiques:', error);
    });
}