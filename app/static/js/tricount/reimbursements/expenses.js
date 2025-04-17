// app/static/js/tricount/reimbursements/expenses.js
/**
 * Gestion des dépenses (édition, visualisation, export)
 */

import { submitFiltersAjax } from './filters.js';
import { populateExpenseEditForm } from '../common/expense_editor.js';

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
    
    // Réinitialiser les sélecteurs à l'ouverture du modal
    editModal.addEventListener('show.bs.modal', function() {
        // Réinitialiser les sélecteurs améliorés si besoin
        setTimeout(() => {
            reinitializeSelectors();
        }, 100);
    });
    
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
            console.log("Édition dépense ID:", expenseId);
            
            // Charger les données de la dépense
            fetchExpenseData(expenseId, function(data) {
                // Réinitialiser le formulaire avant de le remplir
                document.getElementById('edit-expense-form').reset();
                
                // Utiliser le module commun pour remplir le formulaire
                populateExpenseEditForm(data);
                
                // Afficher le modal
                modal.show();
                
                // Réinitialiser les sélecteurs après un court délai
                setTimeout(() => {
                    updateSelectorsWithData(data);
                }, 200);
            });
        });
    });
    
    // Lien dans le modal de consultation pour passer en mode édition
    const editFromViewBtn = document.querySelector('.edit-from-view-btn');
    if (editFromViewBtn) {
        editFromViewBtn.addEventListener('click', function() {
            // Fermer le modal de consultation
            const viewModal = document.getElementById('viewExpenseModal');
            if (viewModal) {
                bootstrap.Modal.getInstance(viewModal).hide();
            }
            
            // Récupérer l'ID de la dépense depuis le formulaire d'édition
            const expenseId = document.getElementById('view-expense-id')?.value;
            if (expenseId) {
                // Charger les données et ouvrir le modal d'édition
                fetchExpenseData(expenseId, function(data) {
                    // Réinitialiser le formulaire avant de le remplir
                    document.getElementById('edit-expense-form').reset();
                    
                    // Utiliser le module commun pour remplir le formulaire
                    populateExpenseEditForm(data);
                    
                    // Afficher le modal
                    modal.show();
                    
                    // Réinitialiser les sélecteurs après un court délai
                    setTimeout(() => {
                        updateSelectorsWithData(data);
                    }, 200);
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
 * Met à jour manuellement les sélecteurs avec les données spécifiées
 * @param {Object} data - Données de la dépense
 */
function updateSelectorsWithData(data) {
    console.log("Mise à jour des sélecteurs avec les données:", data);
    
    // Mettre à jour les sélecteurs Select2
    const categorySelect = document.getElementById('edit-category');
    const flagSelect = document.getElementById('edit-flag');
    
    if (!categorySelect || !flagSelect) {
        console.warn("Sélecteurs de catégorie ou de flag non trouvés");
        return;
    }
    
    // Mettre à jour les valeurs
    if (data.category_id) {
        categorySelect.value = data.category_id;
        console.log("Catégorie définie à:", data.category_id);
    } else {
        categorySelect.value = "";
        console.log("Aucune catégorie définie");
    }
    
    if (data.flag_id) {
        flagSelect.value = data.flag_id;
        console.log("Flag défini à:", data.flag_id);
    } else {
        flagSelect.value = "";
        console.log("Aucun flag défini");
    }
    
    // Déclencher les mises à jour de Select2 si disponible
    if (typeof $ !== 'undefined' && $.fn.select2) {
        try {
            $(categorySelect).trigger('change');
            $(flagSelect).trigger('change');
            console.log("Événements Select2 déclenchés");
        } catch (e) {
            console.error("Erreur lors de la mise à jour des sélecteurs Select2:", e);
        }
    }
    
    // Déclencher l'événement change natif pour la compatibilité avec CategorySelect
    try {
        const eventChange = new Event('change');
        flagSelect.dispatchEvent(eventChange);
        categorySelect.dispatchEvent(eventChange);
        console.log("Événements change natifs déclenchés");
    } catch (e) {
        console.error("Erreur lors du déclenchement des événements change:", e);
    }
}

/**
 * Réinitialise les sélecteurs de catégorie et type
 */
function reinitializeSelectors() {
    console.log("Réinitialisation des sélecteurs");
    
    // Réinitialiser les sélecteurs améliorés
    if (typeof window.EnhancedSelects !== 'undefined' && typeof window.EnhancedSelects.init === 'function') {
        console.log("Réinitialisation des sélecteurs améliorés");
        window.EnhancedSelects.init();
    }
    
    // Réinitialiser la relation catégorie-flag
    if (typeof window.CategorySelect !== 'undefined' && typeof window.CategorySelect.init === 'function') {
        console.log("Réinitialisation des relations catégorie-flag");
        window.CategorySelect.init();
    }
    
    // Actualiser les icônes Iconify
    if (window.Iconify) {
        console.log("Actualisation des icônes Iconify");
        window.Iconify.scan();
    }
}

/**
 * Récupère les données d'une dépense
 * @param {number} expenseId - ID de la dépense
 * @param {Function} callback - Fonction à appeler avec les données
 */
function fetchExpenseData(expenseId, callback) {
    console.log("Fetching expense data for ID:", expenseId);
    
    fetch(`/tricount/reimbursements/expense/${expenseId}`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("Données reçues:", data.expense);
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
            console.log("Affichage dépense ID:", expenseId);
            
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
    if (merchantElement) {
        // Afficher le marchand renommé s'il existe, sinon le marchand original
        merchantElement.textContent = expense.renamed_merchant || expense.merchant;
        
        // Si le marchand a été renommé, ajouter une indication
        if (expense.renamed_merchant) {
            const originalInfo = document.createElement('small');
            originalInfo.className = 'text-muted d-block';
            originalInfo.innerHTML = `<i class="fas fa-tag me-1"></i>Nom original: ${expense.merchant}`;
            merchantElement.appendChild(originalInfo);
        }
    }
    
    const descriptionElement = document.getElementById('view-description');
    if (descriptionElement) {
        // Afficher les notes si elles existent, sinon la description originale
        descriptionElement.textContent = expense.notes || expense.description || 'Aucune description';
        
        // Si des notes ont été ajoutées, ajouter une indication
        if (expense.notes && expense.description) {
            const originalInfo = document.createElement('small');
            originalInfo.className = 'text-muted d-block mt-2';
            originalInfo.innerHTML = `<i class="fas fa-align-left me-1"></i>Description originale: ${expense.description}`;
            descriptionElement.appendChild(originalInfo);
        }
    }
    
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