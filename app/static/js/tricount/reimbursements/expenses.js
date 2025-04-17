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
    
    // Réinitialiser le formulaire à l'ouverture du modal
    editModal.addEventListener('show.bs.modal', function() {
        document.getElementById('edit-expense-form').reset();
        
        // Réinitialiser les sélecteurs améliorés après un court délai
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
        // Supprimer les gestionnaires d'événements existants pour éviter les doublons
        button.removeEventListener('click', handleEditButtonClick);
        // Ajouter le nouveau gestionnaire
        button.addEventListener('click', handleEditButtonClick);
    });
    
    // Fonction pour gérer le clic sur un bouton d'édition
    function handleEditButtonClick() {
        const expenseId = this.dataset.expenseId;
        console.log("Édition dépense ID:", expenseId);
        
        // Charger les données de la dépense
        fetchExpenseData(expenseId, function(data) {
            populateEditForm(data);
            modal.show();
        });
    }
    
    // Lien dans le modal de consultation pour passer en mode édition
    const editFromViewBtn = document.querySelector('.edit-from-view-btn');
    if (editFromViewBtn) {
        editFromViewBtn.addEventListener('click', function() {
            // Fermer le modal de consultation
            const viewModal = document.getElementById('viewExpenseModal');
            if (viewModal) {
                bootstrap.Modal.getInstance(viewModal).hide();
            }
            
            // Récupérer l'ID de la dépense depuis le formulaire caché
            const expenseId = document.getElementById('view-expense-id')?.value;
            if (expenseId) {
                // Charger les données et ouvrir le modal d'édition
                fetchExpenseData(expenseId, function(data) {
                    populateEditForm(data);
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
 * Remplit le formulaire d'édition avec les données de la dépense
 * @param {Object} expense - Données de la dépense
 */
function populateEditForm(expense) {
    // Champs textuels simples
    setFieldValue('edit-expense-id', expense.id);
    setFieldValue('edit-date', expense.date);
    setFieldValue('edit-amount', `${parseFloat(expense.amount).toFixed(2)} €`);
    setFieldValue('edit-original-merchant', expense.merchant);
    setFieldValue('edit-renamed-merchant', expense.renamed_merchant || '');
    setFieldValue('edit-original-description', expense.description || '');
    setFieldValue('edit-notes', expense.notes || '');
    setFieldValue('edit-declaration-reference', expense.declaration_reference || '');
    setFieldValue('edit-declared', expense.is_declared);
    setFieldValue('edit-reimbursed', expense.is_reimbursed);
    
    // Afficher un avertissement si la dépense n'est pas remboursable
    const warningElement = document.getElementById('non-reimbursable-warning');
    if (warningElement) {
        if (expense.flag && expense.flag.reimbursement_type === 'not_reimbursable') {
            warningElement.classList.remove('d-none');
        } else {
            warningElement.classList.add('d-none');
        }
    }
    
    // Remplir les champs plus complexes avec un délai pour s'assurer 
    // que les sélecteurs sont correctement initialisés
    setTimeout(() => {
        updateFlagAndCategorySelectors(expense);
    }, 300);
}

/**
 * Met à jour les sélecteurs de flag et de catégorie de manière coordonnée
 * @param {Object} expense - Données de la dépense
 */
function updateFlagAndCategorySelectors(expense) {
    const flagSelect = document.getElementById('edit-flag');
    const categorySelect = document.getElementById('edit-category');
    
    if (!flagSelect || !categorySelect) {
        console.warn("Sélecteurs manquants:", { flagSelect, categorySelect });
        return;
    }
    
    // IMPORTANT: Définir d'abord le flag, PUIS la catégorie
    // Étape 1: Définir la valeur du flag
    if (expense.flag_id) {
        // Définir d'abord la valeur native
        flagSelect.value = expense.flag_id;
        
        // Déclencher les événements
        // 1. Événement natif
        const nativeChangeEvent = new Event('change', { bubbles: true });
        flagSelect.dispatchEvent(nativeChangeEvent);
        
        // 2. Événement jQuery Select2 (si disponible)
        if (typeof $ !== 'undefined' && $.fn.select2) {
            $(flagSelect).trigger('change.select2');
        }
        
        console.log(`Flag défini à: ${expense.flag_id}`);
    }
    
    // Étape 2: Attendre que le filtrage des catégories soit terminé 
    // avant de définir la catégorie
    setTimeout(() => {
        if (expense.category_id) {
            // Vérifier si la catégorie est disponible après filtrage
            const optionExists = Array.from(categorySelect.options).some(opt => 
                parseInt(opt.value) === expense.category_id
            );
            
            if (optionExists) {
                // Définir la valeur native
                categorySelect.value = expense.category_id;
                
                // Déclencher les événements
                // 1. Événement natif
                const nativeChangeEvent = new Event('change', { bubbles: true });
                categorySelect.dispatchEvent(nativeChangeEvent);
                
                // 2. Événement jQuery Select2 (si disponible)
                if (typeof $ !== 'undefined' && $.fn.select2) {
                    $(categorySelect).trigger('change.select2');
                }
                
                console.log(`Catégorie définie à: ${expense.category_id}`);
            } else {
                console.warn(`La catégorie ID=${expense.category_id} n'est pas disponible avec le flag ID=${expense.flag_id}`);
                
                // Réinitialiser à vide
                categorySelect.value = "";
                if (typeof $ !== 'undefined' && $.fn.select2) {
                    $(categorySelect).trigger('change.select2');
                }
            }
        } else {
            // Pas de catégorie à définir
            categorySelect.value = "";
            if (typeof $ !== 'undefined' && $.fn.select2) {
                $(categorySelect).trigger('change.select2');
            }
        }
    }, 500); // Délai plus long pour s'assurer que le filtrage est terminé
}

/**
 * Définit la valeur d'un champ en fonction de son type
 * @param {string} id - ID du champ
 * @param {any} value - Valeur à définir
 */
function setFieldValue(id, value) {
    const field = document.getElementById(id);
    if (!field) return;
    
    if (field.type === 'checkbox') {
        field.checked = !!value;
    } else {
        field.value = value !== undefined && value !== null ? value : '';
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
        // Supprimer les gestionnaires d'événements existants pour éviter les doublons
        button.removeEventListener('click', handleViewButtonClick);
        // Ajouter le nouveau gestionnaire
        button.addEventListener('click', handleViewButtonClick);
    });
    
    function handleViewButtonClick() {
        const expenseId = this.dataset.expenseId;
        console.log("Affichage dépense ID:", expenseId);
        
        // Récupérer les données et afficher le modal
        fetchExpenseData(expenseId, function(expense) {
            populateViewModal(expense);
            modal.show();
        });
    }
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
            flagElement.innerHTML = expense.flag_html || 
                `<span class="badge" style="background-color: ${expense.flag.color}">${expense.flag.name}</span>`;
        } else {
            flagElement.innerHTML = '<span class="badge bg-secondary">Non défini</span>';
        }
    }
    
    // Afficher le statut de remboursement
    const reimbursableElement = document.getElementById('view-reimbursable-status');
    if (reimbursableElement && expense.flag) {
        if (expense.flag.reimbursement_type === 'not_reimbursable') {
            reimbursableElement.innerHTML = '<span class="badge bg-secondary"><i class="fas fa-ban me-1"></i>Non remboursable</span>';
        } else if (expense.flag.reimbursement_type === 'partially_reimbursable') {
            reimbursableElement.innerHTML = '<span class="badge bg-info"><i class="fas fa-percent me-1"></i>Partiellement remboursable</span>';
        } else if (expense.flag.reimbursement_type === 'fully_reimbursable') {
            reimbursableElement.innerHTML = '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Entièrement remboursable</span>';
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