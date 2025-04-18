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
    if (!expenses || expenses.length === 0) {
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
                if (typeof window.resetFilters === 'function') {
                    window.resetFilters();
                }
            });
        }
        
        return;
    }
    
    // Créer les lignes pour chaque dépense
    expenses.forEach(expense => {
        try {
            // Vérifier que expense est un objet valide
            if (!expense || typeof expense !== 'object') {
                console.error('Invalid expense object:', expense);
                return;
            }
            
            // Valeurs par défaut/sécurisées pour les propriétés essentielles
            const safeExpense = {
                id: expense.id || 0,
                date: expense.date || '',
                merchant: expense.merchant || '',
                description: expense.description || '',
                amount: typeof expense.amount === 'number' ? expense.amount : 0,
                is_debit: typeof expense.is_debit === 'boolean' ? expense.is_debit : true,
                flag_id: expense.flag_id || null,
                flag: expense.flag || null,
                flag_html: expense.flag_html || '<span class="badge bg-secondary">Non défini</span>',
                is_declared: typeof expense.is_declared === 'boolean' ? expense.is_declared : false,
                is_reimbursed: typeof expense.is_reimbursed === 'boolean' ? expense.is_reimbursed : false,
                is_reimbursable: typeof expense.is_reimbursable === 'boolean' ? expense.is_reimbursable : true
            };
            
            // Déterminer si la dépense est non remboursable
            const isNotReimbursable = safeExpense.is_reimbursable === false;
            
            // Préparer les classes de la ligne
            const rowClasses = [];
            if (safeExpense.is_declared) rowClasses.push('expense-declared');
            if (safeExpense.is_reimbursed) rowClasses.push('expense-reimbursed');
            if (isNotReimbursable) rowClasses.push('expense-not-reimbursable');
            
            // Construire HTML de la ligne avec des attributs de tri explicites
            const row = document.createElement('tr');
            row.dataset.expenseId = safeExpense.id;
            row.className = rowClasses.join(' ');
            
            // Préparation des valeurs pour le tri (sans risque d'erreur)
            const dateSortValue = safeExpense.date ? 
                safeExpense.date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3$2$1') : '00000000';
                
            const merchantSortValue = typeof safeExpense.merchant === 'string' ? 
                safeExpense.merchant.toLowerCase() : '';
                
            let flagSortValue = 'zzz'; // Valeur par défaut pour le tri
            if (safeExpense.flag && typeof safeExpense.flag === 'object' && safeExpense.flag.name) {
                flagSortValue = safeExpense.flag.name.toLowerCase();
            }
            
            // Contenu HTML de la ligne
            row.innerHTML = `
                <td>
                    <div class="form-check">
                        <input class="form-check-input expense-checkbox" type="checkbox" value="${safeExpense.id}"
                               ${isNotReimbursable ? 'disabled' : ''}>
                    </div>
                </td>
                <td data-sort-value="${dateSortValue}">
                    ${safeExpense.date}
                </td>
                <td class="description-cell" data-sort-value="${expense.renamed_merchant ? expense.renamed_merchant.toLowerCase() : expense.merchant.toLowerCase()}">
                    <div class="fw-bold">${expense.renamed_merchant || expense.merchant}</div>
                    <div class="small text-muted">${expense.notes || expense.description || ''}</div>
                </td>
                <td class="text-danger" data-sort-value="${parseFloat(safeExpense.amount).toFixed(2)}">
                    ${parseFloat(safeExpense.amount).toFixed(2)} €
                </td>
                <td data-sort-value="${flagSortValue}">
                    ${safeExpense.flag_html}
                </td>
                <td data-sort-value="${safeExpense.is_declared ? '1' : '0'}">
                    <div class="form-check form-switch">
                        <input class="form-check-input status-switch declared-switch" 
                               type="checkbox" 
                               data-expense-id="${safeExpense.id}" 
                               data-status="declared" 
                               ${safeExpense.is_declared ? 'checked' : ''}
                               ${isNotReimbursable ? 'disabled' : ''}>
                        <label class="form-check-label">Déclarée</label>
                        ${isNotReimbursable ? 
                          `<i class="fas fa-info-circle text-muted ms-1" 
                              data-bs-toggle="tooltip" 
                              title="Cette dépense n'est pas remboursable">
                           </i>` : ''}
                    </div>
                </td>
                <td data-sort-value="${safeExpense.is_reimbursed ? '1' : '0'}">
                    <div class="form-check form-switch">
                        <input class="form-check-input status-switch reimbursed-switch" 
                               type="checkbox" 
                               data-expense-id="${safeExpense.id}" 
                               data-status="reimbursed" 
                               ${safeExpense.is_reimbursed ? 'checked' : ''}
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
                            data-expense-id="${safeExpense.id}" 
                            title="Modifier cette dépense">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-info view-expense-btn" 
                            data-expense-id="${safeExpense.id}" 
                            title="Voir les détails">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        } catch (error) {
            console.error('Error processing expense:', error, expense);
        }
    });
    
    // Réinitialiser les fonctionnalités des boutons et sélecteurs
    try {
        initStatusSwitches();
        initBulkSelection();
        initTooltips();
        initExpenseManagement();
    } catch (error) {
        console.error('Error initializing components:', error);
    }
    
    // Réinitialiser le tri des tableaux avec un délai pour éviter les conflits
    if (window.TableSorter && typeof window.TableSorter.init === 'function') {
        setTimeout(() => {
            try {
                window.TableSorter.init();
            } catch (error) {
                console.error('Error initializing table sorter:', error);
            }
        }, 100);
    }
}

/**
 * Met à jour les statistiques du résumé
 * @param {Object} summary - Données de résumé
 */
export function updateSummary(summary) {
    try {
        if (!summary) return;
        
        const totalAmount = document.getElementById('total-amount');
        const totalDeclared = document.getElementById('total-declared');
        const totalReimbursed = document.getElementById('total-reimbursed');
        const percentageDeclared = document.getElementById('percentage-declared');
        const progressCircle = document.getElementById('progress-circle-bg');
        
        const safeSummary = {
            total_amount: typeof summary.total_amount === 'number' ? summary.total_amount : 0,
            total_declared: typeof summary.total_declared === 'number' ? summary.total_declared : 0,
            total_reimbursed: typeof summary.total_reimbursed === 'number' ? summary.total_reimbursed : 0,
            percentage_declared: typeof summary.percentage_declared === 'number' ? summary.percentage_declared : 0
        };
        
        if (totalAmount) totalAmount.textContent = `${safeSummary.total_amount.toFixed(2)} €`;
        if (totalDeclared) totalDeclared.textContent = `${safeSummary.total_declared.toFixed(2)} €`;
        if (totalReimbursed) totalReimbursed.textContent = `${safeSummary.total_reimbursed.toFixed(2)} €`;
        if (percentageDeclared) percentageDeclared.textContent = `${Math.round(safeSummary.percentage_declared)}%`;
        
        // Mettre à jour le cercle de progression
        if (progressCircle) {
            progressCircle.style.background = 
                `conic-gradient(#0d6efd ${safeSummary.percentage_declared}%, #e9ecef 0)`;
        }
    } catch (error) {
        console.error('Error updating summary:', error);
    }
}

/**
 * Met à jour la pagination
 * @param {Object} pagination - Données de pagination
 */
export function updatePagination(pagination) {
    try {
        if (!pagination) return;
        
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;
        
        // Si pas de pages, masquer la pagination
        if (!pagination.pages || pagination.pages <= 1) {
            const paginationParent = document.getElementById('pagination-container');
            if (paginationParent) {
                paginationParent.innerHTML = '';
            }
            return;
        }
        
        // Valeurs sécurisées pour la pagination
        const safePagination = {
            page: parseInt(pagination.page) || 1,
            pages: parseInt(pagination.pages) || 1,
            has_prev: !!pagination.has_prev,
            has_next: !!pagination.has_next,
            prev_num: parseInt(pagination.prev_num) || 1,
            next_num: parseInt(pagination.next_num) || 2
        };
        
        // Générer le HTML de pagination
        let html = '';
        
        // Bouton précédent
        if (safePagination.has_prev) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${safePagination.prev_num}">
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
        let startPage = Math.max(safePagination.page - 2, 1);
        let endPage = Math.min(startPage + 4, safePagination.pages);
        startPage = Math.max(endPage - 4, 1);
        
        // Pages numérotées
        for (let i = startPage; i <= endPage; i++) {
            if (i === safePagination.page) {
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
        if (safePagination.has_next) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${safePagination.next_num}">
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
    } catch (error) {
        console.error('Error updating pagination:', error);
    }
}

/**
 * Récupère et met à jour les statistiques de résumé
 */
export function fetchAndUpdateSummary() {
    try {
        // Récupérer les filtres actuels y compris show_all
        const filterForm = document.getElementById('filter-form');
        if (!filterForm) return;
        
        const formData = new FormData(filterForm);
        
        fetch('/tricount/reimbursements/summary', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.success) {
                updateSummary(data.summary);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des statistiques:', error);
        });
    } catch (error) {
        console.error('Error in fetchAndUpdateSummary:', error);
    }
}