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
AutoCategorize.refreshTimeout = null; // Pour le délai avant rafraîchissement automatique

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
    
    // Détecter les changements dans les filtres pour le badge de notification
    if (merchantContains) {
        merchantContains.addEventListener('input', AutoCategorize.markFormChanged);
    }
    
    if (descriptionContains) {
        descriptionContains.addEventListener('input', AutoCategorize.markFormChanged);
    }
    
    if (minAmount) {
        minAmount.addEventListener('input', AutoCategorize.markFormChanged);
    }
    
    if (maxAmount) {
        maxAmount.addEventListener('input', AutoCategorize.markFormChanged);
    }
    
    // Ajouter un délai de rafraîchissement automatique
    if (merchantContains) {
        merchantContains.addEventListener('input', AutoCategorize.debounceRefresh);
    }
    
    if (descriptionContains) {
        descriptionContains.addEventListener('input', AutoCategorize.debounceRefresh);
    }
    
    if (minAmount) {
        minAmount.addEventListener('input', AutoCategorize.debounceRefresh);
    }
    
    if (maxAmount) {
        maxAmount.addEventListener('input', AutoCategorize.debounceRefresh);
    }
    
    // Sauvegarder les filtres initiaux
    AutoCategorize.saveCurrentFilters();
    
    // Rafraîchir automatiquement au chargement pour prendre en compte tous les filtres
    // y compris la description qui pourrait être ignorée au chargement initial
    setTimeout(function() {
        if (typeof AutoCategorize.UI !== 'undefined' && typeof AutoCategorize.UI.refreshSimilarExpenses === 'function') {
            AutoCategorize.UI.refreshSimilarExpenses();
        }
    }, 500);
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
    const expenseId = document.querySelector('input[name="expense_id"]');
    
    return {
        expense_id: expenseId ? expenseId.value : null,
        merchant_contains: merchantContains ? merchantContains.value : '',
        description_contains: descriptionContains ? descriptionContains.value : '',
        min_amount: minAmount && minAmount.value ? parseFloat(minAmount.value) : null,
        max_amount: maxAmount && maxAmount.value ? parseFloat(maxAmount.value) : null
    };
};

/**
 * Sauvegarde les filtres actuels
 */
AutoCategorize.saveCurrentFilters = function() {
    AutoCategorize.currentFilters = AutoCategorize.getFilters();
};

/**
 * Marque le formulaire comme modifié si les filtres ont changé
 */
AutoCategorize.markFormChanged = function() {
    console.log("Form change detected");
    
    // Vérifier si les filtres ont réellement changé
    const newFilters = AutoCategorize.getFilters();
    const hasChanges = JSON.stringify(newFilters) !== JSON.stringify(AutoCategorize.currentFilters);
    
    if (hasChanges) {
        console.log("Filters changed:", newFilters);
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

/**
 * Déclenche un rafraîchissement avec un délai (debounce)
 */
AutoCategorize.debounceRefresh = function() {
    // Marquer le formulaire comme modifié
    AutoCategorize.markFormChanged();
    
    // Annuler le timer précédent s'il existe
    if (AutoCategorize.refreshTimeout) {
        clearTimeout(AutoCategorize.refreshTimeout);
    }
    
    // Définir un nouveau timer pour le rafraîchissement
    AutoCategorize.refreshTimeout = setTimeout(function() {
        console.log("Auto-refreshing after input change");
        if (AutoCategorize.formChanged) {
            if (typeof AutoCategorize.UI !== 'undefined' && typeof AutoCategorize.UI.refreshSimilarExpenses === 'function') {
                AutoCategorize.UI.refreshSimilarExpenses();
            }
        }
    }, 800); // Délai plus long (800ms) après la dernière modification
};

// Le module s'initialise au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    if (typeof AutoCategorize.initFilters === 'function') {
        AutoCategorize.initFilters();
    }
});