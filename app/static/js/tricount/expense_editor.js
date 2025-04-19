// app/static/js/tricount/expense_editor.js

/**
 * Module pour l'édition des dépenses via un modal
 * Fournit les fonctionnalités nécessaires pour charger, éditer et sauvegarder des dépenses
 */

class ExpenseEditor {
    /**
     * Crée une instance d'ExpenseEditor
     * @param {Object} options - Options de configuration
     */
    constructor(options = {}) {
        // Configuration par défaut
        this.config = {
            modalId: 'editExpenseModal',
            formId: 'edit-expense-form',
            saveButtonId: 'save-expense-btn',
            updateUrl: '/tricount/update_expense',
            expenseEndpointUrl: '/tricount/reimbursements/expense',
            autoRuleCreateUrl: '/tricount/auto-categorize',
            autoRuleEditUrl: '/tricount/auto-rules/edit',
            afterSaveCallback: null,
            ...options
        };
        
        // Éléments DOM
        this.modal = document.getElementById(this.config.modalId);
        this.form = document.getElementById(this.config.formId);
        this.saveButton = document.getElementById(this.config.saveButtonId);
        
        // Vérifier si les éléments existent
        if (!this.modal || !this.form || !this.saveButton) {
            console.error('ExpenseEditor: Certains éléments DOM requis sont manquants');
            return;
        }
        
        // Initialiser
        this.initialize();
    }
    
    /**
     * Initialise les événements et comportements de l'éditeur
     */
    initialize() {
        // Initialiser les comportements de base
        this.initFormBehaviors();
        
        // Initialiser le bouton de sauvegarde
        this.initSaveButton();
        
        // Initialiser les tooltips
        this.initTooltips();
        
        // Initialiser les boutons de règles automatiques
        this.initRuleButtons();
        
        // Créer le conteneur de notification s'il n'existe pas
        this.createNotificationContainer();
        
        console.log('ExpenseEditor initialisé avec succès:', {
            modalId: this.config.modalId,
            formId: this.config.formId,
            updateUrl: this.config.updateUrl,
            expenseEndpointUrl: this.config.expenseEndpointUrl
        });
    }
    
    /**
     * Initialise les comportements du formulaire
     */
    initFormBehaviors() {
        // Relation entre les switches de statut
        const declaredSwitch = document.getElementById('edit-declared');
        const reimbursedSwitch = document.getElementById('edit-reimbursed');
        
        if (declaredSwitch && reimbursedSwitch) {
            reimbursedSwitch.addEventListener('change', () => {
                if (reimbursedSwitch.checked && !declaredSwitch.checked) {
                    declaredSwitch.checked = true;
                }
            });
            
            declaredSwitch.addEventListener('change', () => {
                if (!declaredSwitch.checked && reimbursedSwitch.checked) {
                    reimbursedSwitch.checked = false;
                }
            });
        }
        
        // Initialiser le comportement de renommage
        this.initRenamingBehaviors();
    }
    
    /**
     * Initialise les tooltips dans le modal
     */
    initTooltips() {
        // Bootstrap tooltips
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
            const tooltipTriggerList = [].slice.call(this.modal.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));
        }
    }
    
    /**
     * Initialise les boutons pour créer/éditer les règles
     */
    initRuleButtons() {
        const createRuleBtn = this.modal.querySelector('.create-rule-link');
        const editRuleBtn = this.modal.querySelector('.edit-rule-link');
        
        if (createRuleBtn) {
            createRuleBtn.addEventListener('click', (e) => {
                e.preventDefault();  // Empêcher le comportement par défaut du lien
                
                // Récupérer l'URL de destination
                const url = createRuleBtn.getAttribute('href');
                if (!url || url === '#') {
                    console.error('URL de création de règle non définie');
                    return;
                }
                
                // Fermer le modal avant la redirection
                const modalInstance = bootstrap.Modal.getInstance(this.modal);
                if (modalInstance) {
                    modalInstance.hide();
                    // Attendre que le modal soit fermé avant de rediriger
                    this.modal.addEventListener('hidden.bs.modal', function handler() {
                        window.location.href = url;  // Redirection explicite
                        this.removeEventListener('hidden.bs.modal', handler);
                    });
                } else {
                    // Si pas de modal, rediriger directement
                    window.location.href = url;
                }
            });
        }
        
        if (editRuleBtn) {
            editRuleBtn.addEventListener('click', (e) => {
                e.preventDefault();  // Empêcher le comportement par défaut du lien
                
                // Récupérer l'URL de destination
                const url = editRuleBtn.getAttribute('href');
                if (!url || url === '#') {
                    console.error('URL d\'édition de règle non définie');
                    return;
                }
                
                // Fermer le modal avant la redirection
                const modalInstance = bootstrap.Modal.getInstance(this.modal);
                if (modalInstance) {
                    modalInstance.hide();
                    // Attendre que le modal soit fermé avant de rediriger
                    this.modal.addEventListener('hidden.bs.modal', function handler() {
                        window.location.href = url;  // Redirection explicite
                        this.removeEventListener('hidden.bs.modal', handler);
                    });
                } else {
                    // Si pas de modal, rediriger directement
                    window.location.href = url;
                }
            });
        }
        
        // Imprimer les URLs pour débogage
        if (createRuleBtn) {
            console.log('URL de création de règle:', createRuleBtn.getAttribute('href'));
        }
        if (editRuleBtn) {
            console.log('URL d\'édition de règle:', editRuleBtn.getAttribute('href'));
        }
    }
    
    /**
     * Initialise les comportements de renommage (merchant & description)
     */
    initRenamingBehaviors() {
        // Détecter les modifications dans les champs de renommage
        const renamedMerchantField = document.getElementById('edit-renamed-merchant');
        const notesField = document.getElementById('edit-notes');
        
        if (renamedMerchantField) {
            renamedMerchantField.addEventListener('input', function() {
                if (this.value.trim() !== '') {
                    this.classList.add('modified');
                } else {
                    this.classList.remove('modified');
                }
            });
        }
        
        if (notesField) {
            notesField.addEventListener('input', function() {
                if (this.value.trim() !== '') {
                    this.classList.add('modified');
                } else {
                    this.classList.remove('modified');
                }
            });
        }
    }
    
    /**
     * Initialise le bouton de sauvegarde
     */
    initSaveButton() {
        this.saveButton.addEventListener('click', () => this.saveExpense());
    }
    
    /**
     * Crée un conteneur pour les notifications si nécessaire
     */
    createNotificationContainer() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '1080';
            document.body.appendChild(container);
        }
    }
    
    /**
     * Affiche une notification toast
     * @param {string} message - Message à afficher
     * @param {string} type - Type de notification (success, danger, warning, info)
     */
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        // Créer le toast
        const toast = document.createElement('div');
        toast.className = `toast align-items-center border-0 bg-${type} text-white`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-check-circle me-2"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Initialiser et afficher le toast
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 3000
        });
        bsToast.show();
        
        // Supprimer le toast après qu'il soit caché
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
    
    /**
     * Sauvegarde les modifications de la dépense
     */
    saveExpense() {
        // Créer un FormData à partir du formulaire
        const formData = new FormData(this.form);
        
        // Ajouter les valeurs des checkboxes
        const declaredSwitch = document.getElementById('edit-declared');
        const reimbursedSwitch = document.getElementById('edit-reimbursed');
        
        if (declaredSwitch) {
            formData.append('is_declared', declaredSwitch.checked);
        }
        if (reimbursedSwitch) {
            formData.append('is_reimbursed', reimbursedSwitch.checked);
        }
        
        // Désactiver le bouton pendant la sauvegarde
        this.saveButton.disabled = true;
        this.saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enregistrement...';
        
        // Envoyer les données
        fetch(this.config.updateUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Afficher un message de confirmation
                this.showToast('Modifications enregistrées avec succès', 'success');
                
                // Fermer le modal
                const bsModal = bootstrap.Modal.getInstance(this.modal);
                if (bsModal) bsModal.hide();
                
                // Exécuter le callback après sauvegarde
                if (typeof this.config.afterSaveCallback === 'function') {
                    this.config.afterSaveCallback(data);
                } else if (typeof window.submitFiltersAjax === 'function') {
                    // Fallback sur la fonction globale si disponible
                    window.submitFiltersAjax();
                } else if (typeof window.refreshExpenses === 'function') {
                    // Autre fallback possible
                    window.refreshExpenses();
                }
            } else {
                // Afficher un message d'erreur
                this.showToast('Erreur: ' + (data.error || 'Erreur inconnue'), 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            this.showToast('Erreur de communication avec le serveur', 'danger');
        })
        .finally(() => {
            // Réactiver le bouton
            this.saveButton.disabled = false;
            this.saveButton.innerHTML = 'Enregistrer';
        });
    }
    
    /**
     * Charge une dépense dans le formulaire
     * @param {number} expenseId - ID de la dépense à charger
     * @param {Function} callback - Fonction à exécuter après le chargement
     */
    loadExpense(expenseId, callback) {
        console.log(`Chargement de la dépense ID: ${expenseId}`);
        
        // Vérifier si le modal est initialisé
        if (!this.modal) {
            console.error('ExpenseEditor: Modal non initialisé');
            return;
        }
        
        // Récupérer les données de la dépense via API
        fetch(`${this.config.expenseEndpointUrl}/${expenseId}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Réinitialiser les sélecteurs Select2 s'ils existent
                this.resetSelectors();
                
                // Remplir le formulaire avec les données
                this.populateForm(data.expense);
                
                // Exécuter le callback si fourni
                if (typeof callback === 'function') {
                    callback(data.expense);
                }
                
                // Ouvrir le modal
                const bsModal = new bootstrap.Modal(this.modal);
                bsModal.show();
                
                // Réinitialiser les tooltips après l'ouverture du modal
                setTimeout(() => this.initTooltips(), 300);
            } else {
                this.showToast('Erreur lors du chargement des données: ' + (data.error || 'Erreur inconnue'), 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            this.showToast(`Erreur: ${error.message || 'Problème de communication avec le serveur'}`, 'danger');
        });
    }
    
    /**
     * Réinitialise les sélecteurs Select2
     */
    resetSelectors() {
        // Essayer de réinitialiser Select2 s'il est disponible
        if (typeof $ !== 'undefined' && $.fn.select2) {
            try {
                // Récupérer les sélecteurs dans le modal
                const flagSelect = $(`#${this.modal.id} select[name="flag_id"]`);
                const categorySelect = $(`#${this.modal.id} select[name="category_id"]`);
                
                // Réinitialiser Select2
                if (flagSelect.length) {
                    flagSelect.val(null).trigger('change');
                }
                
                if (categorySelect.length) {
                    categorySelect.val(null).trigger('change');
                }
                
                console.log('Sélecteurs Select2 réinitialisés');
            } catch (err) {
                console.warn('Erreur lors de la réinitialisation des sélecteurs Select2:', err);
            }
        }
        
        // Réinitialiser aussi les sélecteurs de formulaire standards
        const selects = this.form.querySelectorAll('select');
        selects.forEach(select => {
            select.selectedIndex = 0;
        });
    }
    
    /**
     * Remplit le formulaire avec les données d'une dépense
     * @param {Object} expense - Données de la dépense
     */
    populateForm(expense) {
        console.log('Remplissage du formulaire avec les données:', expense);
        
        // Champs textuels simples
        this._setFieldValue('edit-expense-id', expense.id);
        this._setFieldValue('edit-date', expense.date);
        this._setFieldValue('edit-amount', `${parseFloat(expense.amount).toFixed(2)} €`);
        this._setFieldValue('edit-original-merchant', expense.merchant);
        this._setFieldValue('edit-renamed-merchant', expense.renamed_merchant || '');
        this._setFieldValue('edit-original-description', expense.description || '');
        this._setFieldValue('edit-notes', expense.notes || '');
        this._setFieldValue('edit-declaration-ref', expense.declaration_reference || '');
        this._setFieldValue('edit-declared', expense.is_declared);
        this._setFieldValue('edit-reimbursed', expense.is_reimbursed);
        
        // Afficher un avertissement si la dépense n'est pas remboursable
        const warningElement = document.getElementById('non-reimbursable-warning');
        if (warningElement) {
            if (expense.flag && expense.flag.reimbursement_type === 'not_reimbursable') {
                warningElement.classList.remove('d-none');
            } else {
                warningElement.classList.add('d-none');
            }
        }
        
        // Mise à jour des liens de règles automatiques
        this._updateAutoRuleLinks(expense);
        
        // Ouvrir les accordéons si des valeurs existent
        this._toggleAccordionsByValues(expense);
        
        // Remplir les champs plus complexes avec un délai pour s'assurer 
        // que les sélecteurs sont correctement initialisés
        setTimeout(() => {
            this._updateSelectors(expense);
        }, 300);
    }
    
    /**
     * Met à jour les liens pour les règles automatiques
     * @private
     * @param {Object} expense - Données de la dépense
     */
    _updateAutoRuleLinks(expense) {
        const createRuleLink = this.modal.querySelector('.create-rule-link');
        const editRuleLink = this.modal.querySelector('.edit-rule-link');
        
        if (!createRuleLink || !editRuleLink) return;
        
        // Vérifier si une règle existe pour cette dépense
        if (expense.rule_id) {
            // Masquer le lien de création et afficher celui d'édition
            createRuleLink.classList.add('d-none');
            editRuleLink.classList.remove('d-none');
            
            // Mettre à jour l'URL d'édition
            const editUrl = `${this.config.autoRuleEditUrl}/${expense.rule_id}`;
            editRuleLink.setAttribute('href', editUrl);
            console.log('URL d\'édition de règle définie:', editUrl);
        } else {
            // Masquer le lien d'édition et afficher celui de création
            editRuleLink.classList.add('d-none');
            createRuleLink.classList.remove('d-none');
            
            // Mettre à jour l'URL de création
            const createUrl = `${this.config.autoRuleCreateUrl}/${expense.id}`;
            createRuleLink.setAttribute('href', createUrl);
            console.log('URL de création de règle définie:', createUrl);
        }
    }
    
    /**
     * Définit la valeur d'un champ en fonction de son type
     * @private
     * @param {string} id - ID du champ
     * @param {any} value - Valeur à définir
     */
    _setFieldValue(id, value) {
        const field = document.getElementById(id);
        if (!field) return;
        
        if (field.type === 'checkbox') {
            field.checked = !!value;
        } else {
            field.value = value !== undefined && value !== null ? value : '';
        }
    }
    
    /**
     * Ouvre automatiquement les accordéons si des valeurs existent
     * @private
     * @param {Object} expense - Données de la dépense
     */
    _toggleAccordionsByValues(expense) {
        // Ouvrir l'accordéon de marchand si un renommage existe
        if (expense.renamed_merchant) {
            const merchantAccordion = document.getElementById('merchant-rename-collapse');
            if (merchantAccordion) {
                new bootstrap.Collapse(merchantAccordion, {show: true});
            }
        }
        
        // Ouvrir l'accordéon de description si des notes existent
        if (expense.notes) {
            const descriptionAccordion = document.getElementById('description-notes-collapse');
            if (descriptionAccordion) {
                new bootstrap.Collapse(descriptionAccordion, {show: true});
            }
        }
    }
    
    /**
     * Met à jour les sélecteurs de flag et catégorie
     * @private
     * @param {Object} expense - Données de la dépense
     */
    _updateSelectors(expense) {
        const flagSelect = document.getElementById('edit-flag');
        const categorySelect = document.getElementById('edit-category');
        
        if (!flagSelect && !categorySelect) return;
        
        // IMPORTANT: Définir d'abord le flag, PUIS la catégorie
        if (flagSelect && expense.flag_id) {
            console.log(`Définition du flag à ${expense.flag_id}`);
            
            // Définir la valeur native
            flagSelect.value = expense.flag_id;
            
            // Déclencher les événements
            flagSelect.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Événement Select2 si disponible
            if (typeof $ !== 'undefined' && $.fn.select2) {
                try {
                    $(flagSelect).trigger('change.select2');
                } catch (err) {
                    console.warn('Erreur lors du déclenchement de change.select2:', err);
                }
            }
        }
        
        // Attendre que le filtrage des catégories soit terminé
        setTimeout(() => {
            if (categorySelect && expense.category_id) {
                console.log(`Définition de la catégorie à ${expense.category_id}`);
                
                // Vérifier si l'option existe
                const optionExists = Array.from(categorySelect.options).some(opt => 
                    parseInt(opt.value) === expense.category_id
                );
                
                if (optionExists) {
                    console.log(`L'option de catégorie ${expense.category_id} existe`);
                    
                    // Définir la valeur
                    categorySelect.value = expense.category_id;
                    
                    // Déclencher les événements
                    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Événement Select2 si disponible
                    if (typeof $ !== 'undefined' && $.fn.select2) {
                        try {
                            $(categorySelect).trigger('change.select2');
                        } catch (err) {
                            console.warn('Erreur lors du déclenchement de change.select2:', err);
                        }
                    }
                } else {
                    console.warn(`L'option de catégorie ${expense.category_id} n'existe pas, réinitialisation`);
                    
                    // Réinitialiser à vide
                    categorySelect.value = "";
                    if (typeof $ !== 'undefined' && $.fn.select2) {
                        try {
                            $(categorySelect).trigger('change.select2');
                        } catch (err) {
                            console.warn('Erreur lors de la réinitialisation:', err);
                        }
                    }
                }
            }
        }, 500);
        
        // Actualiser les icônes Iconify
        this._refreshIconify();
    }
    
    /**
     * Actualise les icônes Iconify
     * @private
     */
    _refreshIconify() {
        setTimeout(() => {
            if (window.Iconify) {
                console.log('Actualisation des icônes Iconify');
                window.Iconify.scan();
            }
        }, 600);
    }
}

// Création d'une instance globale pour permettre son utilisation
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser l'éditeur s'il y a un modal d'édition de dépense
    if (document.getElementById('editExpenseModal')) {
        window.expenseEditor = new ExpenseEditor({
            afterSaveCallback: function(data) {
                // Chercher une fonction de rafraîchissement dans la page
                if (typeof window.refreshExpenses === 'function') {
                    window.refreshExpenses();
                } else if (typeof window.submitFiltersAjax === 'function') {
                    window.submitFiltersAjax();
                }
            }
        });
        
        // Initialiser les boutons d'édition
        initEditButtons();
    }
});

/**
 * Initialise les boutons d'édition de dépense
 */
function initEditButtons() {
    const editButtons = document.querySelectorAll('.edit-expense-btn');
    
    editButtons.forEach(button => {
        // Écouter les clics sur les boutons d'édition
        button.addEventListener('click', function(e) {
            const expenseId = this.dataset.expenseId;
            
            // Utiliser l'éditeur de dépense pour charger les données
            if (window.expenseEditor) {
                window.expenseEditor.loadExpense(expenseId);
            }
        });
    });
}

// Fonction d'initialisation explicite qui peut être appelée
// pour créer une instance avec des options personnalisées
function initExpenseEditor(options = {}) {
    return new ExpenseEditor(options);
}

// Exposer la classe et la fonction d'initialisation
window.ExpenseEditor = ExpenseEditor;
window.initExpenseEditor = initExpenseEditor;
window.initEditButtons = initEditButtons;