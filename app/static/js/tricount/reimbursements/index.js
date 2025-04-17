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
    
    // Initialiser les fonctionnalités d'interface
    initUI();
    
    // Exposer la fonction resetFilters globalement pour pouvoir l'appeler depuis ailleurs
    window.resetFilters = resetFilters;
    
    console.log("Reimbursements module initialized");
});

/**
 * Initialise les sélecteurs améliorés (Select2 avec icônes)
 */
function initEnhancedSelectors() {
    // Utiliser la fonction globale EnhancedSelects si disponible
    if (typeof window.EnhancedSelects !== 'undefined' && typeof window.EnhancedSelects.init === 'function') {
        console.log("Initializing enhanced selectors (Select2)...");
        window.EnhancedSelects.init();
    } else {
        console.log("EnhancedSelects not available, using basic selectors");
        
        // Initialisation basique des Select2 si disponible
        if (typeof $ !== 'undefined' && $.fn.select2) {
            $('.form-select').select2({
                theme: 'bootstrap-5',
                width: '100%'
            });
        }
    }
    
    // Initialiser les relations catégories-flags si disponible
    if (typeof window.CategorySelect !== 'undefined' && typeof window.CategorySelect.init === 'function') {
        console.log("Initializing category-flag relationships...");
        window.CategorySelect.init();
    }
    
    // Initialiser Iconify pour les icônes si disponible
    if (window.Iconify) {
        console.log("Scanning for Iconify icons...");
        window.Iconify.scan();
    }
}