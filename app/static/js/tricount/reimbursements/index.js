// app/static/js/tricount/reimbursements/index.js
/**
 * Module principal du suivi des remboursements
 * Initialise tous les modules et fonctionnalités
 */

import { initCore } from './core.js';
import { initFilters, resetFilters } from './filters.js';
import { initStatusManagement } from './status.js';
import { initBulkOperations } from './bulk.js';
import { initExpenseManagement } from './expenses.js';
import { initUI } from './ui.js';
import { initExpenseButtons } from './expense_buttons.js';

// Initialisation au chargement du document
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing reimbursements module...");
    
    // Initialiser les fonctionnalités de base
    initCore();
    
    // Initialiser les filtres et la recherche
    initFilters();
    
    // Initialiser la gestion des statuts
    initStatusManagement();
    
    // Initialiser les opérations en masse
    initBulkOperations();
    
    // Initialiser les sélecteurs améliorés (Select2, etc.)
    initEnhancedSelectors();
    
    // Initialiser la gestion des dépenses (édition, visualisation)
    initExpenseManagement();

    // Initialiser les boutons d'édition
    initExpenseButtons();
    
    // Initialiser les fonctionnalités d'interface
    initUI();
    
    // Exposer la fonction resetFilters globalement pour pouvoir l'appeler depuis ailleurs
    window.resetFilters = resetFilters;

    setTimeout(function() {
        if (typeof window.submitFiltersAjax === 'function') {
            window.submitFiltersAjax();
        } else {
            console.error("submitFiltersAjax function not found!");
        }
    }, 100);
});

/**
 * Initialise les sélecteurs améliorés (Select2 avec icônes)
 */
function initEnhancedSelectors() {
    initSelect2();
    initCategoryFlagRelationships();
    initIconify();
}

/**
 * Initialise Select2 pour tous les éléments form-select
 */
function initSelect2() {
    // Utiliser le module dédié si disponible
    if (typeof window.EnhancedSelects !== 'undefined' && typeof window.EnhancedSelects.init === 'function') {
        window.EnhancedSelects.init();
        return;
    }
    
    // Fallback: initialisation directe si jQuery et Select2 sont disponibles
    if (typeof $ !== 'undefined' && $.fn.select2) {
        $('.form-select').select2({
            theme: 'bootstrap-5',
            width: '100%',
            templateResult: formatSelectOption,
            templateSelection: formatSelectOption
        });
    } else {
        console.log("Select2 not available, using native selectors");
    }
}

/**
 * Formatte une option Select2 avec icône si disponible
 * @param {Object} option - L'option à formater
 * @returns {jQuery|string} - L'élément formaté
 */
function formatSelectOption(option) {
    if (!option.id || !option.element) {
        return option.text;
    }

    // Récupérer les attributs de données pour l'icône
    const $option = $(option.element);
    let iconHtml = '';
    
    // Vérifier les différents types d'icônes possibles
    if ($option.data('iconify-id')) {
        iconHtml = `<span class="iconify me-2" data-icon="${$option.data('iconify-id')}"></span>`;
    } else if ($option.data('icon-class')) {
        iconHtml = `<i class="fas ${$option.data('icon-class')} me-2"></i>`;
    } else if ($option.data('icon-emoji')) {
        iconHtml = `<span class="me-2">${$option.data('icon-emoji')}</span>`;
    }
    
    // Retourner l'option formatée avec l'icône si disponible
    if (iconHtml) {
        return $(`<span>${iconHtml} ${option.text}</span>`);
    }
    
    return option.text;
}

/**
 * Initialise les relations catégories-flags
 */
function initCategoryFlagRelationships() {
    if (typeof window.CategorySelect !== 'undefined' && typeof window.CategorySelect.init === 'function') {
        window.CategorySelect.init();
    }
}

/**
 * Initialise Iconify pour le rendu des icônes
 */
function initIconify() {
    if (window.Iconify) {
        window.Iconify.scan();
    }
}