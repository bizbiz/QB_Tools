// app/static/js/tricount/auto_categorize/core.js

/**
 * Module principal pour la fonctionnalité d'auto-catégorisation
 * Initialise et coordonne les autres modules
 */

// Objet global pour stocker l'état et les fonctions
window.AutoCategorize = window.AutoCategorize || {};

// Fonction d'initialisation principale
document.addEventListener('DOMContentLoaded', function() {
    console.log("Auto-categorize core.js loaded");
    
    // S'assurer que les namespaces existent
    window.AutoCategorize.UI = window.AutoCategorize.UI || {};
    
    // Initialiser les composants dans le bon ordre
    AutoCategorize.initFilters();
    AutoCategorize.initFormChangeDetection();
    AutoCategorize.initFlagAndCategory();
    AutoCategorize.initFrequency();
    
    // Initialiser la gestion des conflits si disponible
    if (typeof AutoCategorize.initConflictDetection === 'function') {
        AutoCategorize.initConflictDetection();
    }
    
    // Bouton de rafraîchissement
    const refreshButton = document.getElementById('refresh-similar-expenses');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            console.log("Manual refresh clicked");
            AutoCategorize.UI.refreshSimilarExpenses();
        });
    }
    
    // Effectuer un rafraîchissement initial si on a des filtres préremplis
    const merchantContains = document.getElementById('merchant-contains');
    if (merchantContains && merchantContains.value.trim() !== '') {
        // Attendre que tous les modules soient initialisés
        setTimeout(function() {
            console.log("Performing initial refresh");
            AutoCategorize.UI.refreshSimilarExpenses();
        }, 100);
    }
});

/**
 * Valide le formulaire de règle avant soumission
 * @return {boolean} True si le formulaire est valide, sinon False
 */
function validateRuleForm() {
    const ruleName = document.getElementById('rule-name');
    const merchantContains = document.getElementById('merchant-contains');
    const categoryId = document.getElementById('category-id');
    const flagId = document.getElementById('flag-id');
    const minAmount = document.getElementById('min-amount');
    const maxAmount = document.getElementById('max-amount');
    
    let isValid = true;
    let errorMessage = '';
    
    // Vérifier les champs obligatoires
    if (!ruleName || !ruleName.value.trim()) {
        errorMessage = 'Le nom de la règle est obligatoire.';
        isValid = false;
    } else if (!merchantContains || !merchantContains.value.trim()) {
        errorMessage = 'Le filtre de marchand est obligatoire.';
        isValid = false;
    } else if (!categoryId || !categoryId.value) {
        errorMessage = 'La catégorie est obligatoire.';
        isValid = false;
    } else if (!flagId || !flagId.value) {
        errorMessage = 'Le type de dépense est obligatoire.';
        isValid = false;
    }
    
    // Vérifier la cohérence des montants
    if (minAmount && maxAmount && 
        minAmount.value && maxAmount.value && 
        parseFloat(minAmount.value) > parseFloat(maxAmount.value)) {
        errorMessage = 'Le montant minimum ne peut pas être supérieur au montant maximum.';
        isValid = false;
    }
    
    // Afficher l'erreur si nécessaire
    if (!isValid) {
        alert(errorMessage);
    }
    
    return isValid;
}