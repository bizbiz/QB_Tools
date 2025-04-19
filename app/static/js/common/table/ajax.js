// app/static/js/common/table/ajax.js
/**
 * Module de tri AJAX pour les tableaux
 * Gère le tri côté serveur via des requêtes AJAX
 */

/**
 * Initialise le tri AJAX pour un tableau
 * @param {HTMLElement|string} table - Tableau ou sélecteur du tableau
 * @param {Object} options - Options de configuration
 */
export function initTableAjax(table, options = {}) {
    const tableEl = typeof table === 'string' ? document.querySelector(table) : table;
    
    if (!tableEl) {
        console.error('Table not found:', table);
        return;
    }
    
    // Éviter la double initialisation
    if (tableEl.dataset.ajaxInitialized === 'true') return;
    
    // Configuration par défaut
    const config = {
        formSelector: '#filter-form',                 // Sélecteur du formulaire contenant les filtres
        sortParam: 'sort',                            // Nom du paramètre de tri
        orderParam: 'order',                          // Nom du paramètre d'ordre
        submitFunction: 'submitFiltersAjax',          // Nom de la fonction de soumission
        defaultSort: null,                            // Tri par défaut
        defaultOrder: null,                           // Ordre par défaut
        ...options
    };
    
    // Stocker la configuration sur le tableau
    tableEl.ajaxConfig = config;
    
    // Marquer comme initialisé
    tableEl.dataset.ajaxInitialized = 'true';
    
    // Initialiser l'état interne
    tableEl.sortState = {
        column: config.defaultSort,
        direction: config.defaultOrder
    };
    
    // Initialiser les en-têtes triables
    initAjaxSortHeaders(tableEl);
    
    // Exposer l'API du trieur AJAX
    tableEl.ajaxSorter = {
        sort: (column, direction) => triggerAjaxSort(tableEl, column, direction),
        getCurrentState: () => ({ ...tableEl.sortState }),
        resetUI: () => resetSortUI(tableEl),
        updateUI: () => updateSortUIFromForm(tableEl)
    };
    
    // Initialiser l'UI selon l'état actuel du formulaire
    updateSortUIFromForm(tableEl);
    
    console.log('Tri AJAX initialisé pour:', tableEl.id || 'table sans ID');
}

/**
 * Initialise les en-têtes triables pour l'AJAX
 * @param {HTMLElement} table - Tableau
 */
function initAjaxSortHeaders(table) {
    // Sélectionner les en-têtes, excluant ceux marqués comme non triables
    const headers = table.querySelectorAll('th:not(.no-sort)');
    
    headers.forEach((th, index) => {
        // Ajouter la classe pour le style
        th.classList.add('sortable');
        
        // Ajouter l'indicateur de tri s'il n'existe pas
        if (!th.querySelector('.sort-icon')) {
            const icon = document.createElement('span');
            icon.className = 'sort-icon';
            th.appendChild(icon);
        }
        
        // Supprimer les écouteurs existants pour éviter les duplications
        th.removeEventListener('click', handleAjaxSortClick);
        
        // Stocker une référence à la fonction avec les données du contexte
        th.ajaxSortHandler = (e) => handleAjaxSortClick.call(th, e, table);
        
        // Ajouter l'écouteur d'événement avec la référence
        th.addEventListener('click', th.ajaxSortHandler);
    });
}

// Modifier la fonction handleAjaxSortClick dans app/static/js/common/table/ajax.js

function handleAjaxSortClick(e, table) {
    e.preventDefault();
    
    const th = this;
    
    // LOGS DE DÉBOGAGE: Vérifier si le clic est bien détecté
    console.log('🔍 Clic détecté sur en-tête:', th.textContent.trim());
    console.log('🔍 Attributs:', {
        'data-sort-column': th.dataset.sortColumn,
        'data-sort-dir': th.dataset.sortDir,
        'class': th.className
    });
    
    // Vérifier que nous avons une colonne spécifiée
    if (!th.dataset.sortColumn) {
        console.error('⚠️ Erreur: Aucune colonne spécifiée dans data-sort-column');
        return;
    }
    
    const sortColumn = th.dataset.sortColumn;
    
    // Déterminer la direction de tri
    let direction = th.dataset.sortDir || '';
    
    if (direction === '') {
        direction = 'asc';
    } else if (direction === 'asc') {
        direction = 'desc';
    } else {
        direction = 'asc';
    }
    
    console.log(`🔍 Déclenchement du tri: colonne="${sortColumn}", direction="${direction}"`);
    
    // Déclencher le tri AJAX
    triggerAjaxSort(table, sortColumn, direction);
}

// Modifier la fonction triggerAjaxSort dans le même fichier
function triggerAjaxSort(table, column, direction) {
    const config = table.ajaxConfig;
    
    // LOGS DE DÉBOGAGE
    console.log('🔍 triggerAjaxSort appelé avec:', {
        'column': column,
        'direction': direction,
        'table-id': table.id
    });
    
    // Vérifier que nous avons une configuration valide
    if (!config) {
        console.error('⚠️ Configuration AJAX manquante');
        return;
    }
    
    // Récupérer le formulaire
    const form = document.querySelector(config.formSelector);
    if (!form) {
        console.error('⚠️ Formulaire non trouvé:', config.formSelector);
        return;
    }
    
    // Récupérer ou créer les champs de tri
    let sortInput = form.querySelector(`input[name="${config.sortParam}"]`);
    if (!sortInput) {
        sortInput = document.createElement('input');
        sortInput.type = 'hidden';
        sortInput.name = config.sortParam;
        form.appendChild(sortInput);
    }
    
    let orderInput = form.querySelector(`input[name="${config.orderParam}"]`);
    if (!orderInput) {
        orderInput = document.createElement('input');
        orderInput.type = 'hidden';
        orderInput.name = config.orderParam;
        form.appendChild(orderInput);
    }
    
    // Mettre à jour les valeurs
    sortInput.value = column;
    orderInput.value = direction;
    
    console.log('🔍 Paramètres de tri mis à jour:', {
        'sort': sortInput.value,
        'order': orderInput.value,
        'form-action': form.action || 'no-action'
    });
    
    // Mettre à jour l'état interne
    table.sortState = {
        column,
        direction
    };
    
    // Mettre à jour l'UI
    updateSortUI(table, column, direction);
    
    // Soumettre le formulaire via la fonction spécifiée
    if (config.submitFunction) {
        if (typeof window[config.submitFunction] === 'function') {
            console.log(`🔍 Soumission AJAX via ${config.submitFunction}()`);
            window[config.submitFunction]();
        } else {
            console.error(`⚠️ Fonction ${config.submitFunction} non trouvée`);
            form.submit(); // Fallback
        }
    } else {
        // Soumettre directement si aucune fonction n'est spécifiée
        form.submit();
    }
}

/**
 * Met à jour l'interface utilisateur pour refléter l'état de tri
 * @param {HTMLElement} table - Tableau
 * @param {string} activeColumn - Colonne active
 * @param {string} direction - Direction du tri
 */
function updateSortUI(table, activeColumn, direction) {
    // Réinitialiser tous les en-têtes
    table.querySelectorAll('th.sortable').forEach(header => {
        header.dataset.sortDir = '';
        const icon = header.querySelector('.sort-icon');
        if (icon) icon.className = 'sort-icon';
    });
    
    // Mettre à jour l'en-tête actif
    const activeHeader = Array.from(table.querySelectorAll('th.sortable'))
        .find(h => h.dataset.sortColumn === activeColumn);
    
    if (activeHeader) {
        activeHeader.dataset.sortDir = direction;
        const icon = activeHeader.querySelector('.sort-icon');
        if (icon) icon.className = `sort-icon ${direction}`;
    }
}

/**
 * Réinitialise l'interface utilisateur du tri
 * @param {HTMLElement} table - Tableau
 */
function resetSortUI(table) {
    // Réinitialiser tous les en-têtes
    table.querySelectorAll('th.sortable').forEach(header => {
        header.dataset.sortDir = '';
        const icon = header.querySelector('.sort-icon');
        if (icon) icon.className = 'sort-icon';
    });
    
    // Réinitialiser l'état interne
    table.sortState = {
        column: table.ajaxConfig?.defaultSort || null,
        direction: table.ajaxConfig?.defaultOrder || null
    };
}

/**
 * Met à jour l'interface utilisateur selon les valeurs du formulaire
 * @param {HTMLElement} table - Tableau
 */
function updateSortUIFromForm(table) {
    const config = table.ajaxConfig;
    if (!config) return;
    
    const form = document.querySelector(config.formSelector);
    if (!form) return;
    
    // Récupérer les valeurs actuelles
    const sortInput = form.querySelector(`input[name="${config.sortParam}"]`);
    const orderInput = form.querySelector(`input[name="${config.orderParam}"]`);
    
    if (sortInput && orderInput) {
        const column = sortInput.value;
        const direction = orderInput.value;
        
        if (column && direction) {
            // Mettre à jour l'UI
            updateSortUI(table, column, direction);
            
            // Mettre à jour l'état interne
            table.sortState = {
                column,
                direction
            };
        }
    }
}

// Export par défaut pour les imports ES modules
export default { init: initTableAjax };