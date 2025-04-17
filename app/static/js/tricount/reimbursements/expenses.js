// app/static/js/tricount/reimbursements/expenses.js
/**
 * Gestion des dépenses (édition, visualisation, export)
 */

import { submitFiltersAjax } from './filters.js';

/**
 * Initialise les fonctionnalités de gestion des dépenses
 */
export function initExpenseManagement() {
    initExpenseEdit();
    initExpenseView();
    initExportButton();
}

/**
 * Initialise les fonctionnalités d'édition de dépense
 */
function initExpenseEdit() {
    const editButtons = document.querySelectorAll('.edit-expense-btn');
    const editModal = document.getElementById('editExpenseModal');
    const saveButton = document.getElementById('save-expense-btn');
    
    if (!editModal) return;
    
    const modal = new bootstrap.Modal(editModal);
    
    // Gérer les dépendances entre déclaré et remboursé
    const editDeclaredSwitch = document.getElementById('edit-declared');
    const editReimbursedSwitch = document.getElementById('edit-reimbursed');
    
    if (editDeclaredSwitch && editReimbursedSwitch) {
        editReimbursedSwitch.addEventListener('change', function() {
            if (this.checked && !editDeclaredSwitch.checked) {
                editDeclaredSwitch.checked = true;
            }
        });
        
        editDeclaredSwitch.addEventListener('change', function() {
            if (!this.checked && editReimbursedSwitch.checked) {
                editReimbursedSwitch.checked = false;
            }
        });
    }
    
    // Initialiser les boutons d'édition
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const expenseId = this.dataset.expenseId;
            
            // Charger les données de la dépense
            fetchExpenseData(expenseId, function(data) {
                populateEditModal(data);
                modal.show();
            });
        });
    });
    
    // Lien dans le modal de consultation pour passer en mode édition
    const editFromViewBtn = document.querySelector('.edit-from-view-btn');
    if (editFromViewBtn) {
        editFromViewBtn.addEventListener('click', function() {
            // Fermer le modal de consultation
            bootstrap.Modal.getInstance(document.getElementById('viewExpenseModal')).hide();
            
            // Récupérer l'ID de la dépense depuis le formulaire d'édition
            const expenseId = document.getElementById('view-expense-id')?.value;
            if (expenseId) {
                // Charger les données et ouvrir le modal d'édition
                fetchExpenseData(expenseId, function(data) {
                    populateEditModal(data);
                    modal.show();
                });
            }
        });
    }
    
    // Sauvegarde des modifications
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            const form = document.getElementById('edit-expense-form');
            const formData = new FormData(form);
            
            // Ajouter les statuts
            formData.append('is_declared', document.getElementById('edit-declared').checked);
            formData.append('is_reimbursed', document.getElementById('edit-reimbursed').checked);
            
            // Désactiver le bouton pendant la sauvegarde
            saveButton.disabled = true;
            saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enregistrement...';
            
            // Envoyer les données
            fetch(form.action, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Fermer le modal
                    modal.hide();
                    
                    // Recharger les données
                    submitFiltersAjax();
                    
                    // Afficher un message de succès
                    alert('Modifications enregistrées avec succès.');
                } else {
                    alert('Erreur lors de l\'enregistrement: ' + (data.error || 'Erreur inconnue'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Erreur de communication avec le serveur.');
            })
            .finally(() => {
                // Réactiver le bouton
                saveButton.disabled = false;
                saveButton.innerHTML = 'Enregistrer';
            });
        });
    }
}

/**
 * Récupère les données d'une dépense
 * @param {number} expenseId - ID de la dépense
 * @param {Function} callback - Fonction à appeler avec les données
 */
function fetchExpenseData(expenseId, callback) {
    fetch(`/tricount/reimbursements/expense/${expenseId}`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            callback(data.expense);
        } else {
            alert('Erreur lors du chargement des données: ' + (data.error || 'Erreur inconnue'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Erreur de communication avec le serveur.');
    });
}

/**
 * Remplit le modal d'édition avec les données de la dépense
 * @param {Object} expense - Données de la dépense
 */
function populateEditModal(expense) {
    // Champs cachés
    const expenseIdField = document.getElementById('edit-expense-id');
    if (expenseIdField) expenseIdField.value = expense.id;
    
    // Champs en lecture seule
    const dateField = document.getElementById('edit-date');
    if (dateField) dateField.value = expense.date;
    
    const amountField = document.getElementById('edit-amount');
    if (amountField) amountField.value = `${parseFloat(expense.amount).toFixed(2)} €`;
    
    const merchantField = document.getElementById('edit-merchant');
    if (merchantField) merchantField.value = expense.display_name;
    
    const descriptionField = document.getElementById('edit-description');
    if (descriptionField) descriptionField.value = expense.description;
    
    // Champs éditables
    const categoryField = document.getElementById('edit-category');
    if (categoryField) {
        categoryField.value = expense.category_id || '';
        
        // Si nous utilisons select2, mettre à jour visuellement
        if (typeof $ !== 'undefined' && $.fn.select2) {
            $(categoryField).trigger('change');
        }
    }
    
    const flagField = document.getElementById('edit-flag');
    if (flagField) {
        flagField.value = expense.flag_id || '';
        
        // Si nous utilisons select2, mettre à jour visuellement
        if (typeof $ !== 'undefined' && $.fn.select2) {
            $(flagField).trigger('change');
        }
    }
    
    const notesField = document.getElementById('edit-notes');
    if (notesField) notesField.value = expense.notes || '';
    
    const declRefField = document.getElementById('edit-declaration-ref');
    if (declRefField) declRefField.value = expense.declaration_reference || '';
    
    // Statuts
    const declaredSwitch = document.getElementById('edit-declared');
    if (declaredSwitch) declaredSwitch.checked = expense.is_declared;
    
    const reimbursedSwitch = document.getElementById('edit-reimbursed');
    if (reimbursedSwitch) reimbursedSwitch.checked = expense.is_reimbursed;
}

/**
 * Initialise l'affichage détaillé d'une dépense
 */
function initExpenseView() {
    const viewButtons = document.querySelectorAll('.view-expense-btn');
    const viewModal = document.getElementById('viewExpenseModal');
    
    if (!viewModal) return;
    
    const modal = new bootstrap.Modal(viewModal);
    
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const expenseId = this.dataset.expenseId;
            
            // Récupérer les données et afficher le modal
            fetchExpenseData(expenseId, function(expense) {
                populateViewModal(expense);
                modal.show();
            });
        });
    });
}

/**
 * Remplit le modal de consultation avec les données de la dépense
 * @param {Object} expense - Données de la dépense
 */
function populateViewModal(expense) {
    // ID caché pour le passage en mode édition
    const viewModal = document.getElementById('viewExpenseModal');
    if (!viewModal) return;
    
    // Supprimer l'ancien ID s'il existe
    const oldIdInput = document.getElementById('view-expense-id');
    if (oldIdInput) oldIdInput.remove();
    
    // Créer un nouvel input pour l'ID
    const idInput = document.createElement('input');
    idInput.type = 'hidden';
    idInput.id = 'view-expense-id';
    idInput.value = expense.id;
    viewModal.appendChild(idInput);
    
    // Informations principales
    const merchantElement = document.getElementById('view-merchant');
    if (merchantElement) merchantElement.textContent = expense.display_name;
    
    const descriptionElement = document.getElementById('view-description');
    if (descriptionElement) descriptionElement.textContent = expense.description || 'Aucune description';
    
    // Montant et date
    const amountElement = document.getElementById('view-amount');
    if (amountElement) {
        amountElement.textContent = `${parseFloat(expense.amount).toFixed(2)} €`;
        amountElement.className = expense.is_debit ? 'text-danger mb-0' : 'text-success mb-0';
    }
    
    const dateElement = document.getElementById('view-date');
    if (dateElement) dateElement.textContent = expense.date;
    
    // Catégorie et flag
    const categoryElement = document.getElementById('view-category');
    if (categoryElement) {
        if (expense.category) {
            categoryElement.innerHTML = 
                `<span class="category-badge" style="border-color: ${expense.category.color}">
                     ${expense.category.name}
                 </span>`;
        } else {
            categoryElement.innerHTML = '<span class="badge bg-secondary">Non catégorisé</span>';
        }
    }
    
    const flagElement = document.getElementById('view-flag');
    if (flagElement) {
        if (expense.flag) {
            flagElement.innerHTML = expense.flag_html;
        } else {
            flagElement.innerHTML = '<span class="badge bg-secondary">Non défini</span>';
        }
    }
    
    // Statut, références et dates
    const statusElement = document.getElementById('view-status');
    if (statusElement) {
        let statusHtml = '';
        if (expense.is_reimbursed) {
            statusHtml = '<span class="badge bg-success">Remboursée</span>';
        } else if (expense.is_declared) {
            statusHtml = '<span class="badge bg-primary">Déclarée</span>';
        } else {
            statusHtml = '<span class="badge bg-secondary">Non déclarée</span>';
        }
        statusElement.innerHTML = statusHtml;
    }
    
    const referenceElement = document.getElementById('view-reference');
    if (referenceElement) referenceElement.textContent = expense.declaration_reference || 'Aucune référence';
    
    const notesElement = document.getElementById('view-notes');
    if (notesElement) notesElement.textContent = expense.notes || 'Aucune note';
    
    const declDateElement = document.getElementById('view-declaration-date');
    if (declDateElement) declDateElement.textContent = expense.declaration_date || 'Non déclarée';
    
    const reimbDateElement = document.getElementById('view-reimbursement-date');
    if (reimbDateElement) reimbDateElement.textContent = expense.reimbursement_date || 'Non remboursée';
    
    // Texte original
    const originalTextContainer = document.getElementById('original-text-container');
    const originalTextElement = document.getElementById('view-original-text');
    
    if (originalTextContainer && originalTextElement) {
        if (expense.original_text) {
            originalTextElement.textContent = expense.original_text;
            originalTextContainer.style.display = 'block';
        } else {
            originalTextContainer.style.display = 'none';
        }
    }
}

/**
 * Initialise le bouton d'export
 */
function initExportButton() {
    const exportBtn = document.getElementById('export-btn');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            // Récupérer tous les filtres actuels
            const filterForm = document.getElementById('filter-form');
            if (!filterForm) return;
            
            const formData = new FormData(filterForm);
            
            // Créer une URL avec tous les paramètres
            const params = new URLSearchParams(formData);
            const exportUrl = `/tricount/reimbursements/export?${params.toString()}`;
            
            // Rediriger vers l'URL d'export
            window.location.href = exportUrl;
        });
    }
}