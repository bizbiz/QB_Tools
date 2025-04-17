// app/static/js/tricount/common/expense_editor.js
/**
 * Module commun pour l'édition des dépenses
 * Fournit des fonctionnalités réutilisables pour la manipulation des dépenses
 * entre les différents modules (categorize, reimbursements, etc.)
 */

/**
 * Initialise les fonctionnalités de renommage du marchand et de la description
 * @param {Object} options - Options de configuration
 */
export function initExpenseRenaming(options = {}) {
    // Configuration par défaut
    const config = {
        merchantRenameCollapse: '#merchant-rename-collapse',
        descriptionNotesCollapse: '#description-notes-collapse',
        originalMerchantField: '#edit-original-merchant',
        renamedMerchantField: '#edit-renamed-merchant',
        originalDescriptionField: '#edit-original-description',
        notesField: '#edit-notes',
        ...options
    };

    // Gérer l'ouverture du collapse de marchand si un renommage existe
    const merchantRenameCollapse = document.querySelector(config.merchantRenameCollapse);
    const renamedMerchantField = document.querySelector(config.renamedMerchantField);
    
    if (merchantRenameCollapse && renamedMerchantField) {
        // Ouvrir automatiquement si un renommage existe
        if (renamedMerchantField.value && renamedMerchantField.value.trim() !== '') {
            const bsCollapse = new bootstrap.Collapse(merchantRenameCollapse, {
                show: true
            });
        }
        
        // Détecter les changements sur le champ de renommage
        renamedMerchantField.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                this.classList.add('modified');
            } else {
                this.classList.remove('modified');
            }
        });
    }
    
    // Gérer l'ouverture du collapse de description si des notes existent
    const descriptionNotesCollapse = document.querySelector(config.descriptionNotesCollapse);
    const notesField = document.querySelector(config.notesField);
    
    if (descriptionNotesCollapse && notesField) {
        // Ouvrir automatiquement si des notes existent
        if (notesField.value && notesField.value.trim() !== '') {
            const bsCollapse = new bootstrap.Collapse(descriptionNotesCollapse, {
                show: true
            });
        }
        
        // Détecter les changements sur le champ de notes
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
 * Remplit les champs d'édition avec les données d'une dépense
 * @param {Object} expense - Données de la dépense
 * @param {Object} options - Options de configuration
 */
export function populateExpenseEditForm(expense, options = {}) {
    // Configuration par défaut
    const config = {
        expenseIdField: '#edit-expense-id',
        dateField: '#edit-date',
        amountField: '#edit-amount',
        originalMerchantField: '#edit-original-merchant',
        renamedMerchantField: '#edit-renamed-merchant',
        originalDescriptionField: '#edit-original-description',
        notesField: '#edit-notes',
        categoryField: '#edit-category',
        flagField: '#edit-flag',
        declaredSwitch: '#edit-declared',
        reimbursedSwitch: '#edit-reimbursed',
        declRefField: '#edit-declaration-ref',
        ...options
    };
    
    // Remplir les champs avec les données
    const setFieldValue = (selector, value) => {
        const field = document.querySelector(selector);
        if (field) {
            if (field.type === 'checkbox') {
                field.checked = value;
            } else {
                field.value = value || '';
            }
        }
    };
    
    // Champs de base
    setFieldValue(config.expenseIdField, expense.id);
    setFieldValue(config.dateField, expense.date);
    setFieldValue(config.amountField, `${parseFloat(expense.amount).toFixed(2)} €`);
    
    // Champs de marchand
    setFieldValue(config.originalMerchantField, expense.merchant);
    setFieldValue(config.renamedMerchantField, expense.renamed_merchant);
    
    // Champs de description
    setFieldValue(config.originalDescriptionField, expense.description);
    setFieldValue(config.notesField, expense.notes);
    
    // Catégorie et Flag
    setFieldValue(config.categoryField, expense.category_id);
    setFieldValue(config.flagField, expense.flag_id);
    
    // Champs de déclaration
    setFieldValue(config.declaredSwitch, expense.is_declared);
    setFieldValue(config.reimbursedSwitch, expense.is_reimbursed);
    setFieldValue(config.declRefField, expense.declaration_reference);
    
    // Si les sélecteurs utilisent Select2, déclencher l'événement change
    if (typeof $ !== 'undefined' && $.fn.select2) {
        $(config.categoryField).trigger('change');
        $(config.flagField).trigger('change');
    }
    
    // Initialiser les fonctionnalités de renommage
    initExpenseRenaming();
}