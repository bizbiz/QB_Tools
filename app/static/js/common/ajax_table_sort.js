// app/static/js/common/ajax_table_sort.js
/**
 * Module pour gérer uniquement le tri AJAX sans tri côté client
 * À utiliser quand le tri est entièrement géré par le serveur
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les tableaux triables
    initAjaxSortTables();
});

/**
 * Initialise tous les tableaux avec tri AJAX
 */
function initAjaxSortTables() {
    document.querySelectorAll('.ajax-sortable-table').forEach(initAjaxSortTable);
}

/**
 * Initialise un tableau spécifique avec tri AJAX
 * @param {HTMLElement} table - Tableau à initialiser
 */
function initAjaxSortTable(table) {
    // Éviter la double initialisation
    if (table.dataset.sortInitialized === 'true') return;
    
    console.log("Initialisation du tri AJAX pour:", table.id || "tableau sans ID");
    
    // Marquer comme initialisé
    table.dataset.sortInitialized = 'true';
    
    // Configuration par défaut
    const config = {
        formSelector: '#filter-form',
        sortParam: 'sort',
        orderParam: 'order',
        submitFunction: 'submitFiltersAjax'
    };
    
    // Stocker la configuration sur l'élément du tableau
    table.ajaxSortConfig = config;
    
    // Ajouter des écouteurs aux en-têtes triables
    const headers = table.querySelectorAll('th:not(.no-sort)');
    headers.forEach(function(th) {
        // Supprimer les gestionnaires existants
        th.removeEventListener('click', handleSortHeaderClick);
        
        // Ajouter la classe pour le style
        th.classList.add('sortable');
        
        // Ajouter l'icône de tri si absente
        if (!th.querySelector('.sort-icon')) {
            const icon = document.createElement('span');
            icon.className = 'sort-icon';
            th.appendChild(icon);
        }
        
        // Ajouter le nouvel écouteur d'événement pour le tri
        th.addEventListener('click', handleSortHeaderClick);
    });
    
    // Initialiser l'état du tri (icônes, etc.)
    updateSortUI(table);
}

/**
 * Gère le clic sur un en-tête pour le tri
 * @param {Event} e - L'événement de clic
 */
function handleSortHeaderClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const th = this;
    const table = th.closest('table');
    
    // Vérifier que la configuration est disponible
    if (!table || !table.ajaxSortConfig) {
        console.error("Configuration de tri AJAX non trouvée");
        return;
    }
    
    const config = table.ajaxSortConfig;
    const form = document.querySelector(config.formSelector);
    
    if (!form) {
        console.error("Formulaire non trouvé:", config.formSelector);
        return;
    }
    
    // Récupérer la colonne à trier
    const sortColumn = th.dataset.sortColumn;
    if (!sortColumn) {
        console.error("Colonne de tri non spécifiée dans data-sort-column");
        return;
    }
    
    // Récupérer les champs de tri dans le formulaire
    const sortInput = form.querySelector(`input[name="${config.sortParam}"]`);
    const orderInput = form.querySelector(`input[name="${config.orderParam}"]`);
    
    if (!sortInput || !orderInput) {
        console.error("Champs de tri non trouvés dans le formulaire");
        return;
    }
    
    // Déterminer la nouvelle direction de tri
    let newOrder = 'asc';
    if (sortInput.value === sortColumn) {
        // Si on trie déjà sur cette colonne, inverser l'ordre
        newOrder = orderInput.value === 'asc' ? 'desc' : 'asc';
    }
    
    console.log(`Tri AJAX: colonne=${sortColumn}, ordre=${newOrder}`);
    
    // Mettre à jour les champs de tri
    sortInput.value = sortColumn;
    orderInput.value = newOrder;
    
    // Mettre à jour l'interface utilisateur
    updateSortUI(table, sortColumn, newOrder);
    
    // Déclencher la requête AJAX
    if (typeof window[config.submitFunction] === 'function') {
        window[config.submitFunction]();
    } else {
        console.warn(`Fonction ${config.submitFunction} non disponible`);
        // Fallback: soumettre le formulaire normalement
        form.submit();
    }
}

/**
 * Met à jour l'interface utilisateur pour refléter l'état du tri
 * @param {HTMLElement} table - Tableau à mettre à jour
 * @param {string} [activeColumn] - Colonne active (optionnel)
 * @param {string} [activeDirection] - Direction active (optionnel)
 */
function updateSortUI(table, activeColumn, activeDirection) {
    const headers = table.querySelectorAll('th.sortable');
    const config = table.ajaxSortConfig || {};
    
    // Si les paramètres ne sont pas fournis, les récupérer du formulaire
    if (!activeColumn || !activeDirection) {
        const form = document.querySelector(config.formSelector);
        if (form) {
            const sortInput = form.querySelector(`input[name="${config.sortParam || 'sort'}"]`);
            const orderInput = form.querySelector(`input[name="${config.orderParam || 'order'}"]`);
            
            if (sortInput && orderInput) {
                activeColumn = sortInput.value;
                activeDirection = orderInput.value;
            }
        }
    }
    
    // Réinitialiser tous les en-têtes
    headers.forEach(function(header) {
        header.dataset.sortDir = '';
        const icon = header.querySelector('.sort-icon');
        if (icon) {
            icon.className = 'sort-icon';
        }
    });
    
    // Appliquer l'état actif à l'en-tête concerné
    if (activeColumn) {
        const activeHeader = Array.from(headers).find(h => h.dataset.sortColumn === activeColumn);
        if (activeHeader) {
            activeHeader.dataset.sortDir = activeDirection;
            const icon = activeHeader.querySelector('.sort-icon');
            if (icon) {
                icon.className = `sort-icon ${activeDirection}`;
            }
        }
    }
}

// Exposer l'API pour utilisation externe
window.AjaxTableSort = {
    init: initAjaxSortTables,
    initTable: initAjaxSortTable,
    updateUI: updateSortUI
};