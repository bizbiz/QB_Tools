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
export function updateTableContent(html) {
    const tableBody = document.getElementById('expenses-table-body');
    
    if (!tableBody) return;
    
    // Remplacer le contenu par le HTML généré côté serveur
    tableBody.innerHTML = html;
    
    // Réinitialiser les fonctionnalités interactives
    initStatusSwitches();
    initBulkSelection();
    initTooltips();
    initExpenseManagement();
    
    // Réinitialiser le tri des tableaux
    if (window.TableSorter && typeof window.TableSorter.init === 'function') {
        setTimeout(() => window.TableSorter.init(), 100);
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