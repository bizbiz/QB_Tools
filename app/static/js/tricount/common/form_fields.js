// app/static/js/tricount/common/form_fields.js
/**
 * Utilitaires partagés pour le remplissage de formulaires
 */

/**
 * Remplit un formulaire avec les données d'une dépense
 * Version améliorée pour garantir un remplissage correct
 * @param {Object} expense - Données de la dépense
 * @param {Object} options - Options de configuration
 */
export function fillExpenseForm(expense, options = {}) {
    console.log("Remplissage du formulaire avec les données:", expense);
    
    // Configuration par défaut
    const config = {
        idField: 'edit-expense-id',
        dateField: 'edit-date',
        amountField: 'edit-amount',
        merchantField: 'edit-original-merchant',
        renamedMerchantField: 'edit-renamed-merchant',
        descriptionField: 'edit-original-description',
        notesField: 'edit-notes',
        categoryField: 'edit-category',
        flagField: 'edit-flag',
        declaredSwitch: 'edit-declared',
        reimbursedSwitch: 'edit-reimbursed',
        referenceField: 'edit-declaration-ref',
        ...options
    };
    
    // Fonction utilitaire pour définir la valeur d'un champ
    function setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (!field) {
            console.warn(`Champ non trouvé: ${fieldId}`);
            return false;
        }
        
        if (field.type === 'checkbox') {
            field.checked = !!value;
        } else {
            field.value = value !== undefined && value !== null ? value : '';
        }
        
        // Déclencher un événement change pour les sélecteurs améliorés
        if (field.tagName === 'SELECT') {
            field.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Support pour Select2
            if (typeof $ !== 'undefined' && $.fn.select2) {
                try {
                    $(field).trigger('change.select2');
                } catch (e) {
                    console.warn("Erreur Select2:", e);
                }
            }
        }
        
        return true;
    }
    
    // Remplir les champs de base
    setFieldValue(config.idField, expense.id);
    setFieldValue(config.dateField, expense.date);
    
    // Formater le montant correctement
    const formattedAmount = expense.amount 
        ? `${parseFloat(expense.amount).toFixed(2)} €` 
        : '';
    setFieldValue(config.amountField, formattedAmount);
    
    // Informations de marchand
    setFieldValue(config.merchantField, expense.merchant);
    setFieldValue(config.renamedMerchantField, expense.renamed_merchant || '');
    
    // Informations de description
    setFieldValue(config.descriptionField, expense.description || '');
    setFieldValue(config.notesField, expense.notes || '');
    
    // Catégorie et flag
    setFieldValue(config.categoryField, expense.category_id);
    setFieldValue(config.flagField, expense.flag_id);
    
    // Statuts de déclaration
    setFieldValue(config.declaredSwitch, expense.is_declared || expense.declaration_status === 'declared' || expense.declaration_status === 'reimbursed');
    setFieldValue(config.reimbursedSwitch, expense.is_reimbursed || expense.declaration_status === 'reimbursed');
    
    // Référence
    setFieldValue(config.referenceField, expense.declaration_reference || '');
    
    // Mettre à jour l'avertissement si nécessaire
    const warningElement = document.getElementById('non-reimbursable-warning');
    if (warningElement) {
        const isReimbursable = expense.is_reimbursable !== false;
        warningElement.classList.toggle('d-none', isReimbursable);
    }
    
    console.log("Formulaire rempli avec succès");
}

export default { fillExpenseForm };