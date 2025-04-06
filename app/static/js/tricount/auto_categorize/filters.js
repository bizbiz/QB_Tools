// app/static/js/tricount/auto_categorize/filters.js

/**
 * Module de gestion des filtres pour l'auto-catégorisation
 * Gère la détection des changements et la récupération des filtres
 */

// Assurer que l'objet global existe
window.AutoCategorize = window.AutoCategorize || {};

// Variables globales
AutoCategorize.formChanged = false;
AutoCategorize.currentFilters = {};

/**
 * Initialise les éléments des filtres et sauvegarde l'état initial
 */
AutoCategorize.initFilters = function() {
    // Éléments du DOM liés aux filtres
    const merchantContains = document.getElementById('merchant-contains');
    const descriptionContains = document.getElementById('description-contains');
    const minAmount = document.getElementById('min-amount');
    const maxAmount = document.getElementById('max-amount');
    
    // Formater les champs de montant pour n'accepter que des nombres
    if (minAmount) {
        minAmount.addEventListener('input', formatAmountInput);
    }
    
    if (maxAmount) {
        maxAmount.addEventListener('input', formatAmountInput);
    }
    
    // Sauvegarder les filtres initiaux
    AutoCategorize.saveCurrentFilters();
};

/**
 * Formate l'entrée pour n'accepter que des nombres avec deux décimales
 * @param {Event} e - L'événement input
 */
function formatAmountInput(e) {
    const input = e.target;
    const value = input.value;
    
    // Ne rien faire si vide
    if (!value) return;
    
    // Supprimer les caractères non numériques sauf point et virgule
    let formatted = value.replace(/[^\d.,]/g, '');
    
    // Remplacer la virgule par un point
    formatted = formatted.replace(',', '.');
    
    // S'assurer qu'il n'y a qu'un seul point décimal
    const parts = formatted.split('.');
    if (parts.length > 2) {
        formatted = `${parts[0]}.${parts.slice(1).join('')}`;
    }
    
    // Limiter à deux décimales
    if (parts.length === 2 && parts[1].length > 2) {
        formatted = `${parts[0]}.${parts[1].substring(0, 2)}`;
    }
    
    // Mettre à jour la valeur si elle a changé
    if (formatted !== value) {
        input.value = formatted;
    }
}

/**
 * Obtient tous les filtres actuels du formulaire
 * @return {Object} Les filtres formatés pour l'API
 */
AutoCategorize.getFilters = function() {
    const merchantContains = document.getElementById('merchant-contains');
    const descriptionContains = document.getElementById('description-contains');
    const minAmount = document.getElementById('min-amount');
    const maxAmount = document.getElementById('max-amount');
    
    // Obtenir les valeurs des montants uniquement si elles sont valides
    let minAmountValue = null;
    if (minAmount && minAmount.value && minAmount.value.trim() !== '') {
        try {
            minAmountValue = parseFloat(minAmount.value);
            if (isNaN(minAmountValue)) {
                minAmountValue = null;
            }
        } catch (e) {
            console.error("Erreur lors de la conversion de min_amount:", e);
            minAmountValue = null;
        }
    }
    
    let maxAmountValue = null;
    if (maxAmount && maxAmount.value && maxAmount.value.trim() !== '') {
        try {
            maxAmountValue = parseFloat(maxAmount.value);
            if (isNaN(maxAmountValue)) {
                maxAmountValue = null;
            }
        } catch (e) {
            console.error("Erreur lors de la conversion de max_amount:", e);
            maxAmountValue = null;
        }
    }
    
    const filters = {
        merchant_contains: merchantContains ? merchantContains.value : '',
        description_contains: descriptionContains ? descriptionContains.value : '',
        min_amount: minAmountValue,
        max_amount: maxAmountValue
    };
    
    return filters;
};

/**
 * Sauvegarde les filtres actuels
 */
AutoCategorize.saveCurrentFilters = function() {
    AutoCategorize.currentFilters = AutoCategorize.getFilters();
};

/**
 * Initialise la détection des changements du formulaire
 */
AutoCategorize.initFormChangeDetection = function() {
    // Détecter les changements dans tous les champs du formulaire
    document.querySelectorAll('.rule-input').forEach(input => {
        input.addEventListener('input', AutoCategorize.markFormChanged);
        input.addEventListener('change', AutoCategorize.markFormChanged);
    });
};

/**
 * Marque le formulaire comme modifié si les filtres ont changé
 */
AutoCategorize.markFormChanged = function() {
    // Vérifier si les filtres ont réellement changé
    const newFilters = AutoCategorize.getFilters();
    const hasChanges = JSON.stringify(newFilters) !== JSON.stringify(AutoCategorize.currentFilters);
    
    if (hasChanges) {
        AutoCategorize.formChanged = true;
        
        const refreshNeededBadge = document.getElementById('refresh-needed-badge');
        if (refreshNeededBadge) {
            refreshNeededBadge.classList.remove('d-none');
        }
        
        const similarExpensesTable = document.getElementById('similar-expenses-table');
        if (similarExpensesTable) {
            similarExpensesTable.classList.add('stale-data');
        }
    }
};