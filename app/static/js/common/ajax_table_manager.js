// app/static/js/common/ajax_table_manager.js
/**
 * Module de gestion des tableaux avec tri AJAX
 * Extension du gestionnaire de tableau standard avec support de tri côté serveur
 */

/**
 * Initialise un tableau avec support de tri AJAX
 * @param {string|HTMLElement} tableSelector - Sélecteur ou élément du tableau
 * @param {Object} options - Options de configuration
 */
function initAjaxTable(tableSelector, options = {}) {
    const table = typeof tableSelector === 'string' 
        ? document.querySelector(tableSelector) 
        : tableSelector;
    
    if (!table) {
        console.error('Table not found:', tableSelector);
        return;
    }
    
    // Configuration par défaut
    const config = {
        formSelector: '#filter-form',              // Formulaire contenant les filtres
        sortParamName: 'sort',                     // Nom du paramètre de tri
        orderParamName: 'order',                   // Nom du paramètre d'ordre
        submitFunction: null,                      // Fonction personnalisée pour soumettre la requête
        defaultSort: 'date',                       // Tri par défaut
        defaultOrder: 'desc',                      // Ordre par défaut
        onBeforeSort: null,                        // Callback avant le tri
        onAfterSort: null,                         // Callback après le tri
        processorFunction: null,                   // Fonction pour traiter les résultats
        ...options
    };
    
    // Marquer la table comme initialisée avec AJAX
    table.classList.add('ajax-sortable');
    table.dataset.ajaxSortable = 'true';
    
    // Stocker la configuration dans la table
    table.ajaxSortConfig = config;
    
    // Récupérer le formulaire associé
    const form = document.querySelector(config.formSelector);
    if (!form) {
        console.error('Form not found:', config.formSelector);
        return;
    }
    
    // Créer ou mettre à jour les champs de tri cachés
    let sortInput = form.querySelector(`input[name="${config.sortParamName}"]`);
    if (!sortInput) {
        sortInput = document.createElement('input');
        sortInput.type = 'hidden';
        sortInput.name = config.sortParamName;
        sortInput.value = config.defaultSort;
        form.appendChild(sortInput);
    }
    
    let orderInput = form.querySelector(`input[name="${config.orderParamName}"]`);
    if (!orderInput) {
        orderInput = document.createElement('input');
        orderInput.type = 'hidden';
        orderInput.name = config.orderParamName;
        orderInput.value = config.defaultOrder;
        form.appendChild(orderInput);
    }
    
    // Initialiser les en-têtes triables
    initAjaxSortHeaders(table, config);
    
    // Initialiser l'état de tri initial
    updateSortUI(table, sortInput.value, orderInput.value);
    
    console.log('AJAX table initialized with config:', config);
}

/**
 * Initialise les en-têtes de colonne pour le tri AJAX
 * @param {HTMLElement} table - Élément de table
 * @param {Object} config - Configuration
 */
function initAjaxSortHeaders(table, config) {
    // Sélectionner tous les en-têtes sauf ceux marqués comme non triables
    const headers = table.querySelectorAll('th:not(.no-sort)');
    
    headers.forEach((header, index) => {
        // Ajouter une classe pour le style
        header.classList.add('sortable');
        
        // Ajouter un attribut d'index si absent
        if (!header.hasAttribute('data-sort-index')) {
            header.dataset.sortIndex = index;
        }
        
        // Ajouter un nom de colonne pour le tri si absent
        if (!header.hasAttribute('data-sort-column')) {
            // Essayer de deviner le nom de la colonne à partir du texte
            const headerText = header.textContent.trim().toLowerCase();
            let columnName = headerText.replace(/\s+/g, '_');
            
            // Vérifier si un type est spécifié
            if (header.dataset.type === 'date') {
                columnName = 'date';
            } else if (header.dataset.type === 'number' && /montant|amount|prix|price/.test(headerText)) {
                columnName = 'amount';
            } else if (/desc|description/.test(headerText)) {
                columnName = 'description';
            }
            
            header.dataset.sortColumn = columnName;
        }
        
        // Ajouter un indicateur visuel de tri s'il n'existe pas déjà
        if (!header.querySelector('.sort-icon')) {
            const icon = document.createElement('span');
            icon.className = 'sort-icon';
            header.appendChild(icon);
        }
        
        // Supprimer les gestionnaires existants pour éviter les duplications
        header.removeEventListener('click', handleAjaxSortHeaderClick);
        
        // Ajouter le nouveau gestionnaire
        header.addEventListener('click', handleAjaxSortHeaderClick);
    });
}

/**
 * Gère le clic sur un en-tête pour le tri AJAX
 * @param {Event} e - Événement de clic
 */
function handleAjaxSortHeaderClick(e) {
    e.preventDefault();
    
    const header = this;
    const table = header.closest('table');
    
    // Vérifier que la table a une configuration AJAX
    if (!table || !table.ajaxSortConfig) {
        console.error('Table missing AJAX sort configuration');
        return;
    }
    
    const config = table.ajaxSortConfig;
    const form = document.querySelector(config.formSelector);
    
    if (!form) {
        console.error('Form not found:', config.formSelector);
        return;
    }
    
    // Récupérer le nom de la colonne et l'ordre actuel
    const columnName = header.dataset.sortColumn;
    
    // Récupérer les champs de tri
    const sortInput = form.querySelector(`input[name="${config.sortParamName}"]`);
    const orderInput = form.querySelector(`input[name="${config.orderParamName}"]`);
    
    // Déterminer le nouvel ordre
    let newOrder = 'asc';
    if (sortInput.value === columnName) {
        // Si on trie déjà sur cette colonne, inverser l'ordre
        newOrder = orderInput.value === 'asc' ? 'desc' : 'asc';
    }
    
    // Mettre à jour les champs cachés
    sortInput.value = columnName;
    orderInput.value = newOrder;
    
    // Mettre à jour l'affichage des icônes
    updateSortUI(table, columnName, newOrder);
    
    // Appeler le callback onBeforeSort si défini
    if (typeof config.onBeforeSort === 'function') {
        config.onBeforeSort(table, columnName, newOrder);
    }
    
    // Soumettre le formulaire via AJAX
    if (typeof config.submitFunction === 'function') {
        // Utiliser la fonction personnalisée
        config.submitFunction(form);
    } else if (typeof window.submitFiltersAjax === 'function') {
        // Utiliser la fonction globale si disponible
        window.submitFiltersAjax();
    } else {
        // Soumettre le formulaire normalement
        form.submit();
    }
}

/**
 * Met à jour l'interface utilisateur pour refléter l'état de tri actuel
 * @param {HTMLElement} table - Élément de table
 * @param {string} sortColumn - Colonne de tri
 * @param {string} sortOrder - Ordre de tri ('asc' ou 'desc')
 */
function updateSortUI(table, sortColumn, sortOrder) {
    // Réinitialiser tous les en-têtes
    const headers = table.querySelectorAll('th.sortable');
    headers.forEach(header => {
        // Supprimer l'attribut de direction
        header.dataset.sortDir = '';
        
        // Réinitialiser l'icône
        const icon = header.querySelector('.sort-icon');
        if (icon) {
            icon.className = 'sort-icon';
        }
    });
    
    // Mettre à jour l'en-tête actif
    const activeHeader = Array.from(headers).find(h => h.dataset.sortColumn === sortColumn);
    if (activeHeader) {
        // Définir la direction
        activeHeader.dataset.sortDir = sortOrder;
        
        // Mettre à jour l'icône
        const icon = activeHeader.querySelector('.sort-icon');
        if (icon) {
            icon.className = `sort-icon ${sortOrder}`;
        }
    }
}

/**
 * Interprète les données pour la colonne de description/marchand
 * @param {Object} expense - Objet de dépense
 * @returns {string} - Chaîne formatée pour le tri
 */
function formatMerchantForSorting(expense) {
    // Utiliser le nom renommé s'il existe, sinon le nom original
    return expense.renamed_merchant ? expense.renamed_merchant.toLowerCase() : expense.merchant.toLowerCase();
}

/**
 * Formate les valeurs numériques pour le tri
 * @param {string|number} value - Valeur à formater
 * @returns {number} - Nombre pour le tri
 */
function formatNumberForSorting(value) {
    if (typeof value === 'number') return value;
    
    // Nettoyer la chaîne (enlever les espaces, symboles de devise, etc.)
    const cleaned = String(value).replace(/[^\d.,\-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

/**
 * Formate les dates pour le tri (format français DD/MM/YYYY)
 * @param {string} dateStr - Chaîne de date
 * @returns {number} - Timestamp pour le tri
 */
function formatDateForSorting(dateStr) {
    // Format français: DD/MM/YYYY
    const parts = String(dateStr).split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Mois commencent à 0 en JS
        const year = parseInt(parts[2], 10);
        
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day).getTime();
        }
    }
    
    // Essayer de parser directement si le format ne correspond pas
    return new Date(dateStr).getTime() || 0;
}

// Exposer les fonctions publiquement
window.AjaxTableManager = {
    init: initAjaxTable,
    updateSortUI: updateSortUI,
    formatters: {
        merchant: formatMerchantForSorting,
        number: formatNumberForSorting,
        date: formatDateForSorting
    }
};