// app/static/js/common/table/index.js
/**
 * Module principal de gestion des tableaux
 * Détecte le type de tableau et initialise les fonctionnalités appropriées
 */

import { initTableCore } from './core.js';
import { initTableSorter } from './sorter.js';
import { initTableAjax } from './ajax.js';

/**
 * Initialise tous les tableaux de la page en détectant leur type
 */
function initTables() {
    // Initialiser d'abord les fonctionnalités de base pour tous les tableaux
    initTableCore();
    
    // Détecter et initialiser les tableaux AJAX
    document.querySelectorAll('table.ajax-table').forEach(table => {
        console.log('Initialisation tableau AJAX:', table.id || 'table sans ID');
        initTableAjax(table);
    });
    
    // Détecter et initialiser les tableaux avec tri côté client
    document.querySelectorAll('table.client-sort-table').forEach(table => {
        console.log('Initialisation tableau avec tri client:', table.id || 'table sans ID');
        initTableSorter(table);
    });
    
    // Vérifier s'il y a des tableaux qui utilisent l'ancien système
    document.querySelectorAll('table.sortable-table:not(.ajax-table):not(.client-sort-table)').forEach(table => {
        console.warn('Tableau utilisant l\'ancien système de tri détecté:', table.id || 'table sans ID');
        console.warn('Veuillez migrer vers les nouvelles classes: "ajax-table" ou "client-sort-table"');
        // Appliquer le tri client par défaut pour la rétrocompatibilité
        initTableSorter(table);
    });
}

// Initialiser au chargement du document
document.addEventListener('DOMContentLoaded', initTables);

// Exporter l'API publique
export default {
    init: initTables,
    // Réexporter les API des sous-modules pour un accès facile
    core: { init: initTableCore },
    sorter: { init: initTableSorter },
    ajax: { init: initTableAjax }
};

// Exposition globale pour utilisation dans les scripts traditionnels
window.TableManager = {
    init: initTables,
    initAjaxTable: initTableAjax,
    initSorterTable: initTableSorter
};