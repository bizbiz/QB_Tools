// app/static/js/tricount/reimbursements/index.js
/**
 * Module principal du suivi des remboursements
 * Initialise tous les modules et fonctionnalités
 */

import { initCore } from './core.js';
import { initFilters } from './filters.js';
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
    
    // Initialiser la gestion des dépenses (édition, visualisation)
    initExpenseManagement();
    
    // Initialiser les fonctionnalités d'interface
    initUI();
    
    console.log("Reimbursements module initialized");
});