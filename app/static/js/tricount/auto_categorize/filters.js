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
    const frequencyType = document.getElementById('frequency-type');
    const frequencyDay = document.getElementById('frequency-day');
    const merchantContains = document.getElementById('merchant-contains');
    const descriptionContains = document.getElementById('description-contains');
    const minAmount = document.getElementById('min-amount');
    const maxAmount = document.getElementById('max-amount');
    
    return {
        merchant_contains: merchantContains ? merchantContains.value : '',
        description_contains: descriptionContains ? descriptionContains.value : '',
        frequency_type: frequencyType ? frequencyType.value : 'none',
        frequency_day: (frequencyType && frequencyType.value !== 'none' && frequencyDay) ? 
            parseInt(frequencyDay.value) : null,
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
 * Initialise la détection des changements du formulaire
 */
AutoCategorize.initFormChangeDetection = function() {
    // Détecter les changements dans tous les champs du formulaire
    document.querySelectorAll('.rule-input').forEach(input => {
        input.addEventListener('input', AutoCategorize.markFormChanged);
        input.addEventListener('change', AutoCategorize.markFormChanged);
    });
    
    // Ajouter des écouteurs spécifiques pour les filtres principaux avec auto-refresh
    const merchantContains = document.getElementById('merchant-contains');
    const descriptionContains = document.getElementById('description-contains');
    
    if (merchantContains) {
        merchantContains.addEventListener('input', AutoCategorize.debounceRefresh);
    }
    
    if (descriptionContains) {
        descriptionContains.addEventListener('input', AutoCategorize.debounceRefresh);
    }
    
    // Ajouter un écouteur aux contrôles de fréquence avec auto-refresh
    const frequencyType = document.getElementById('frequency-type');
    if (frequencyType) {
        frequencyType.addEventListener('change', AutoCategorize.triggerRefresh);
    }
    
    const frequencyDay = document.getElementById('frequency-day');
    if (frequencyDay) {
        frequencyDay.addEventListener('input', AutoCategorize.debounceRefresh);
    }
    
    // Ajouter un écouteur aux montants avec auto-refresh
    const minAmount = document.getElementById('min-amount');
    const maxAmount = document.getElementById('max-amount');
    
    if (minAmount) {
        minAmount.addEventListener('input', AutoCategorize.debounceRefresh);
    }
    
    if (maxAmount) {
        maxAmount.addEventListener('input', AutoCategorize.debounceRefresh);
    }
};

/**
 * Déclencher un rafraîchissement avec un délai (debounce)
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
            AutoCategorize.triggerRefresh();
        }
    }, 500); // Délai de 500ms après la dernière modification
};

/**
 * Déclenche immédiatement un rafraîchissement des dépenses similaires
 */
AutoCategorize.triggerRefresh = function() {
    console.log("Triggering refresh");
    if (typeof AutoCategorize.UI !== 'undefined' && typeof AutoCategorize.UI.refreshSimilarExpenses === 'function') {
        AutoCategorize.UI.refreshSimilarExpenses();
    } else {
        console.warn("AutoCategorize.UI.refreshSimilarExpenses is not available");
    }
};

/**
 * Marque le formulaire comme modifié si les filtres ont changé
 */
AutoCategorize.markFormChanged = function() {
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