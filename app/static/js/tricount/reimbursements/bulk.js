// app/static/js/tricount/reimbursements/bulk.js
/**
 * Gestion des opérations en masse sur les dépenses
 */

import { submitFiltersAjax } from './filters.js';

/**
 * Initialise les fonctionnalités d'opérations en masse
 */
export function initBulkOperations() {
    initBulkSelection();
}

/**
 * Initialise les fonctionnalités de sélection en masse
 */
export function initBulkSelection() {
    const selectAllCheckbox = document.getElementById('select-all-expenses');
    const expenseCheckboxes = document.querySelectorAll('.expense-checkbox');
    const bulkDeclareBtn = document.getElementById('bulk-declare-btn');
    const selectedCountSpan = document.getElementById('selected-count');
    const confirmBulkBtn = document.getElementById('confirm-bulk-declare');
    
    if (!selectAllCheckbox || !bulkDeclareBtn) return;
    
    // Réinitialiser l'état du checkbox "Tout sélectionner"
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    
    // Sélectionner/désélectionner toutes les dépenses
    selectAllCheckbox.addEventListener('change', function() {
        const isChecked = this.checked;
        
        expenseCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
            
            // Mise à jour de l'apparence de la ligne
            const row = checkbox.closest('tr');
            if (row) {
                if (isChecked) {
                    row.classList.add('selected');
                } else {
                    row.classList.remove('selected');
                }
            }
        });
        
        updateSelectedCount();
    });
    
    // Gérer le changement d'état des checkboxes individuels
    expenseCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const row = this.closest('tr');
            if (row) {
                if (this.checked) {
                    row.classList.add('selected');
                } else {
                    row.classList.remove('selected');
                }
            }
            
            updateSelectedCount();
            updateSelectAllState();
        });
    });
    
    // Gérer le bouton de déclaration en masse
    if (bulkDeclareBtn) {
        bulkDeclareBtn.addEventListener('click', function() {
            const selectedCount = document.querySelectorAll('.expense-checkbox:checked').length;
            
            if (selectedCount === 0) {
                alert('Veuillez sélectionner au moins une dépense.');
                return;
            }
            
            // Mettre à jour le compteur dans la modal
            if (selectedCountSpan) {
                selectedCountSpan.textContent = selectedCount;
            }
            
            // Ouvrir la modal
            const bulkDeclareModal = new bootstrap.Modal(document.getElementById('bulkDeclareModal'));
            bulkDeclareModal.show();
        });
    }
    
    // Gérer les dépendances entre les switches de statut dans la modal
    const bulkDeclaredSwitch = document.getElementById('bulk-declared');
    const bulkReimbursedSwitch = document.getElementById('bulk-reimbursed');
    
    if (bulkDeclaredSwitch && bulkReimbursedSwitch) {
        bulkReimbursedSwitch.addEventListener('change', function() {
            if (this.checked && !bulkDeclaredSwitch.checked) {
                bulkDeclaredSwitch.checked = true;
            }
        });
        
        bulkDeclaredSwitch.addEventListener('change', function() {
            if (!this.checked && bulkReimbursedSwitch.checked) {
                bulkReimbursedSwitch.checked = false;
            }
        });
    }
    
    // Confirmer la modification en masse
    if (confirmBulkBtn) {
        confirmBulkBtn.addEventListener('click', function() {
            processBulkUpdate();
        });
    }
    
    // Mettre à jour le compteur de sélection initial
    updateSelectedCount();
}

/**
 * Met à jour l'affichage du nombre d'éléments sélectionnés
 */
function updateSelectedCount() {
    const selectedCount = document.querySelectorAll('.expense-checkbox:checked').length;
    const selectedCountSpan = document.getElementById('selected-count');
    const bulkDeclareBtn = document.getElementById('bulk-declare-btn');
    
    if (selectedCountSpan) {
        selectedCountSpan.textContent = selectedCount;
    }
    
    // Activer/désactiver le bouton selon la sélection
    if (bulkDeclareBtn) {
        if (selectedCount > 0) {
            bulkDeclareBtn.textContent = `Déclarer la sélection (${selectedCount})`;
            bulkDeclareBtn.disabled = false;
        } else {
            bulkDeclareBtn.textContent = 'Déclarer la sélection';
            bulkDeclareBtn.disabled = true;
        }
    }
}

/**
 * Met à jour l'état du checkbox "Tout sélectionner"
 */
function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('select-all-expenses');
    if (!selectAllCheckbox) return;
    
    const totalCheckboxes = document.querySelectorAll('.expense-checkbox').length;
    const checkedCount = document.querySelectorAll('.expense-checkbox:checked').length;
    
    if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === totalCheckboxes) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.indeterminate = true;
    }
}

/**
 * Traite la mise à jour en masse des dépenses
 */
function processBulkUpdate() {
    // Récupérer les IDs des dépenses sélectionnées
    const selectedIds = Array.from(document.querySelectorAll('.expense-checkbox:checked'))
        .map(checkbox => checkbox.value);
    
    // Récupérer le statut à appliquer
    const declaredChecked = document.getElementById('bulk-declared').checked;
    const reimbursedChecked = document.getElementById('bulk-reimbursed').checked;
    
    let status;
    if (reimbursedChecked) {
        status = 'reimbursed';
    } else if (declaredChecked) {
        status = 'declared';
    } else {
        status = 'not_declared';
    }
    
    // Afficher un indicateur de chargement
    const confirmBulkBtn = document.getElementById('confirm-bulk-declare');
    confirmBulkBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Traitement...';
    confirmBulkBtn.disabled = true;
    
    // Appeler l'API pour mettre à jour les statuts
    fetch('/tricount/reimbursements/bulk-update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            expense_ids: selectedIds,
            status: status
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Fermer la modal
            bootstrap.Modal.getInstance(document.getElementById('bulkDeclareModal')).hide();
            
            // Afficher un message de succès
            alert(`${data.updated} dépenses mises à jour avec succès. ${data.skipped} dépenses ignorées.`);
            
            // Recharger les données via AJAX
            submitFiltersAjax();
        } else {
            alert('Erreur lors de la mise à jour: ' + (data.error || 'Erreur inconnue'));
            confirmBulkBtn.innerHTML = 'Confirmer';
            confirmBulkBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Erreur de communication avec le serveur.');
        confirmBulkBtn.innerHTML = 'Confirmer';
        confirmBulkBtn.disabled = false;
    });
}