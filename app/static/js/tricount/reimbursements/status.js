// app/static/js/tricount/reimbursements/status.js
/**
 * Gestion des statuts de remboursement
 */

import { fetchAndUpdateSummary } from './ui.js';

/**
 * Initialise les fonctionnalités de gestion des statuts
 */
export function initStatusManagement() {
    initStatusSwitches();
}

/**
 * Initialise les switches de statut
 */
export function initStatusSwitches() {
    const statusSwitches = document.querySelectorAll('.status-switch');
    
    statusSwitches.forEach(statusSwitch => {
        // Supprimer les anciens écouteurs pour éviter les duplications
        statusSwitch.removeEventListener('change', handleStatusSwitchChange);
        
        // Ajouter le nouvel écouteur
        statusSwitch.addEventListener('change', handleStatusSwitchChange);
    });
}

/**
 * Gère le changement d'état d'un switch de statut
 * @param {Event} event - Événement de changement
 */
function handleStatusSwitchChange(event) {
    const expenseId = this.dataset.expenseId;
    const status = this.dataset.status;
    const isChecked = this.checked;
    const row = document.querySelector(`tr[data-expense-id="${expenseId}"]`);
    
    if (!row) return;
    
    // Gérer la dépendance entre déclaré et remboursé
    if (status === 'reimbursed' && isChecked) {
        // Si on coche remboursé, il faut aussi cocher déclaré
        const declaredSwitch = row.querySelector('.declared-switch');
        if (declaredSwitch && !declaredSwitch.checked) {
            declaredSwitch.checked = true;
        }
    } else if (status === 'declared' && !isChecked) {
        // Si on décoche déclaré, il faut aussi décocher remboursé
        const reimbursedSwitch = row.querySelector('.reimbursed-switch');
        if (reimbursedSwitch && reimbursedSwitch.checked) {
            reimbursedSwitch.checked = false;
        }
    }
    
    // Déterminer le nouveau statut
    let newStatus;
    const declaredChecked = row.querySelector('.declared-switch').checked;
    const reimbursedChecked = row.querySelector('.reimbursed-switch').checked;
    
    if (reimbursedChecked) {
        newStatus = 'reimbursed';
    } else if (declaredChecked) {
        newStatus = 'declared';
    } else {
        newStatus = 'not_declared';
    }
    
    // Mettre à jour le statut via AJAX
    updateExpenseStatus(expenseId, newStatus, row);
}

/**
 * Met à jour le statut d'une dépense via AJAX
 * @param {number} expenseId - ID de la dépense
 * @param {string} status - Nouveau statut
 * @param {HTMLElement} row - Élément TR de la dépense
 */
function updateExpenseStatus(expenseId, status, row) {
    // Ajouter une classe pour indiquer le chargement
    row.classList.add('status-updating');
    
    // Créer les données de la requête
    const formData = new FormData();
    formData.append('status', status);
    
    // Envoyer la requête AJAX
    fetch(`/tricount/reimbursements/update/${expenseId}`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Mettre à jour les classes de la ligne selon le nouveau statut
            row.classList.remove('expense-declared', 'expense-reimbursed');
            
            if (status === 'declared') {
                row.classList.add('expense-declared');
            } else if (status === 'reimbursed') {
                row.classList.add('expense-declared', 'expense-reimbursed');
            }
            
            // Ajouter une animation pour montrer que le statut a été mis à jour
            row.classList.add('status-updated');
            setTimeout(() => {
                row.classList.remove('status-updated');
            }, 2000);
            
            // Vérifier si la ligne devrait être masquée en fonction des filtres actuels
            checkRowVisibility(row);
            
            // Actualiser les statistiques
            fetchAndUpdateSummary();
        } else {
            // Afficher une erreur
            console.error('Erreur lors de la mise à jour du statut:', data.error);
            alert('Erreur lors de la mise à jour du statut: ' + (data.error || 'Erreur inconnue'));
            
            // Restaurer l'état précédent des switches
            restoreSwitchesState(row, status);
        }
    })
    .catch(error => {
        console.error('Erreur AJAX:', error);
        alert('Erreur de communication avec le serveur.');
        
        // Restaurer l'état précédent des switches
        restoreSwitchesState(row, status);
    })
    .finally(() => {
        // Supprimer la classe de chargement
        row.classList.remove('status-updating');
    });
}

/**
 * Restaure l'état des switches en cas d'erreur
 * @param {HTMLElement} row - Élément TR de la dépense
 * @param {string} failedStatus - Statut qui a échoué
 */
function restoreSwitchesState(row, failedStatus) {
    const declaredSwitch = row.querySelector('.declared-switch');
    const reimbursedSwitch = row.querySelector('.reimbursed-switch');
    
    // Restaurer l'état des switches selon les classes de la ligne
    if (row.classList.contains('expense-reimbursed')) {
        if (declaredSwitch) declaredSwitch.checked = true;
        if (reimbursedSwitch) reimbursedSwitch.checked = true;
    } else if (row.classList.contains('expense-declared')) {
        if (declaredSwitch) declaredSwitch.checked = true;
        if (reimbursedSwitch) reimbursedSwitch.checked = false;
    } else {
        if (declaredSwitch) declaredSwitch.checked = false;
        if (reimbursedSwitch) reimbursedSwitch.checked = false;
    }
}

/**
 * Vérifie si une ligne doit être visible en fonction des filtres actuels
 * @param {HTMLElement} row - Élément TR de la dépense
 */
function checkRowVisibility(row) {
    // Récupérer les statuts filtrés
    const statusFilters = Array.from(document.querySelectorAll('.filter-status-switch:checked'))
        .map(checkbox => checkbox.value);
    
    // Si aucun filtre actif, conserver toutes les lignes visibles
    if (statusFilters.length === 0) {
        return;
    }
    
    // Déterminer le statut de la ligne
    let rowStatus;
    if (row.classList.contains('expense-reimbursed')) {
        rowStatus = 'reimbursed';
    } else if (row.classList.contains('expense-declared')) {
        rowStatus = 'declared';
    } else {
        rowStatus = 'not_declared';
    }
    
    // Vérifier si le statut de la ligne correspond aux filtres
    const visible = statusFilters.includes(rowStatus);
    
    if (!visible) {
        hideRow(row);
    }
}

/**
 * Cache une ligne avec une animation améliorée
 * @param {HTMLElement} row - La ligne à cacher
 */
function hideRow(row) {
    // Stocker la hauteur initiale pour l'animation
    const initialHeight = row.offsetHeight;
    row.style.height = `${initialHeight}px`;
    
    // Forcer le repaint pour que l'animation fonctionne
    row.offsetHeight;
    
    // Appliquer l'animation de disparition
    row.style.transition = 'opacity 0.3s ease, height 0.5s ease, padding 0.5s ease';
    row.style.opacity = '0';
    row.style.padding = '0';
    row.style.height = '0';
    row.style.overflow = 'hidden';
    
    // Mettre à jour les statistiques - pas besoin d'attendre la fin de l'animation
    fetchAndUpdateSummary();
    
    // Une fois l'animation terminée, supprimer la ligne
    setTimeout(() => {
        // Supprimer la ligne du DOM
        if (row.parentNode) {
            row.parentNode.removeChild(row);
        }
        
        // Mettre à jour le compteur de résultats
        const totalRows = document.querySelectorAll('#expenses-table-body tr:not([style*="height: 0"])').length;
        const expenseCount = document.getElementById('expenses-count');
        if (expenseCount) {
            expenseCount.textContent = `${totalRows} dépenses`;
        }
        
        // Afficher un message si plus aucune dépense
        if (totalRows === 0) {
            const tableBody = document.getElementById('expenses-table-body');
            tableBody.innerHTML = `
                <tr>
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
        }
    }, 500); // Durée de l'animation
}