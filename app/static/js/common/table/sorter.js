// app/static/js/common/table/sorter.js
/**
 * Module de tri côté client pour les tableaux
 * À utiliser pour les tableaux dont les données sont déjà chargées dans le DOM
 */

/**
 * Initialise le tri pour un tableau
 * @param {HTMLElement|string} table - Tableau ou sélecteur du tableau
 */
export function initTableSorter(table) {
    const tableEl = typeof table === 'string' ? document.querySelector(table) : table;
    
    if (!tableEl) {
        console.error('Table not found:', table);
        return;
    }
    
    // Éviter la double initialisation
    if (tableEl.dataset.sorterInitialized === 'true') return;
    
    // Marquer comme initialisé
    tableEl.dataset.sorterInitialized = 'true';
    
    // Initialiser l'état de tri interne
    tableEl.sortState = {
        column: null,
        direction: null
    };
    
    // Initialiser les en-têtes triables
    initSortHeaders(tableEl);
    
    // Exposer l'API du trieur
    tableEl.sorter = {
        sort: (columnIndex, direction) => sortTable(tableEl, columnIndex, direction),
        getCurrentState: () => ({ ...tableEl.sortState }),
        reset: () => resetSort(tableEl)
    };
    
    console.log('Tri côté client initialisé pour:', tableEl.id || 'table sans ID');
}

/**
 * Initialise les en-têtes triables
 * @param {HTMLElement} table - Tableau
 */
function initSortHeaders(table) {
    // Sélectionner les en-têtes de colonne, excluant ceux marqués comme non triables
    const headers = table.querySelectorAll('th:not(.no-sort)');
    
    headers.forEach((th, index) => {
        // Ajouter un attribut d'index si absent
        if (!th.dataset.sortIndex) {
            th.dataset.sortIndex = index;
        }
        
        // Ajouter la classe pour le style
        th.classList.add('sortable');
        
        // Ajouter l'indicateur de tri si absent
        if (!th.querySelector('.sort-icon')) {
            const icon = document.createElement('span');
            icon.className = 'sort-icon';
            th.appendChild(icon);
        }
        
        // Supprimer les écouteurs existants pour éviter les duplications
        th.removeEventListener('click', handleSortHeaderClick);
        
        // Ajouter l'écouteur d'événement
        th.addEventListener('click', handleSortHeaderClick);
    });
}

/**
 * Gère le clic sur un en-tête triable
 * @param {Event} e - Événement de clic
 */
function handleSortHeaderClick(e) {
    e.preventDefault();
    
    const th = this;
    const table = th.closest('table');
    const columnIndex = parseInt(th.dataset.sortIndex, 10);
    
    // Déterminer la direction de tri
    let direction = th.dataset.sortDir || '';
    
    if (direction === '') {
        direction = 'asc';
    } else if (direction === 'asc') {
        direction = 'desc';
    } else {
        direction = 'asc';
    }
    
    // Trier le tableau
    sortTable(table, columnIndex, direction);
}

/**
 * Trie un tableau
 * @param {HTMLElement} table - Tableau à trier
 * @param {number} columnIndex - Index de la colonne
 * @param {string} direction - Direction du tri ('asc' ou 'desc')
 */
function sortTable(table, columnIndex, direction) {
    // Vérifier les entrées
    if (!table || isNaN(columnIndex)) return;
    if (!['asc', 'desc'].includes(direction)) direction = 'asc';
    
    // Récupérer le corps du tableau
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    // Récupérer les lignes et les convertir en tableau
    const rows = Array.from(tbody.rows);
    if (rows.length <= 1) return; // Pas besoin de trier s'il y a 0 ou 1 ligne
    
    // Récupérer le type de données
    const headerCell = table.querySelector(`th[data-sort-index="${columnIndex}"]`);
    const dataType = headerCell?.dataset.type || guessDataType(rows, columnIndex);
    
    console.log(`Tri de la colonne ${columnIndex} (${dataType}) en ${direction}`);
    
    // Trier les lignes
    rows.sort((rowA, rowB) => {
        const cellA = rowA.cells[columnIndex];
        const cellB = rowB.cells[columnIndex];
        
        if (!cellA || !cellB) return 0;
        
        // Récupérer les valeurs de tri
        const valueA = getCellValue(cellA, dataType);
        const valueB = getCellValue(cellB, dataType);
        
        // Comparer selon le type
        let result;
        
        if (dataType === 'number') {
            result = parseFloat(valueA) - parseFloat(valueB);
        } else if (dataType === 'date') {
            result = parseDateValue(valueA) - parseDateValue(valueB);
        } else {
            result = String(valueA).localeCompare(String(valueB), undefined, { sensitivity: 'base' });
        }
        
        // Inverser pour le tri descendant
        return direction === 'asc' ? result : -result;
    });
    
    // Mettre à jour l'interface utilisateur
    updateSortUI(table, columnIndex, direction);
    
    // Mettre à jour l'état interne
    table.sortState = {
        column: columnIndex,
        direction: direction
    };
    
    // Réorganiser les lignes dans le DOM
    rows.forEach(row => tbody.appendChild(row));
    
    // Déclencher un événement pour notifier que le tableau a été trié
    table.dispatchEvent(new CustomEvent('table:sorted', {
        bubbles: true,
        detail: { columnIndex, direction }
    }));
}

/**
 * Met à jour l'interface utilisateur pour refléter l'état de tri
 * @param {HTMLElement} table - Tableau
 * @param {number} activeColumnIndex - Index de la colonne active
 * @param {string} direction - Direction du tri
 */
function updateSortUI(table, activeColumnIndex, direction) {
    // Réinitialiser tous les en-têtes
    table.querySelectorAll('th').forEach(header => {
        header.dataset.sortDir = '';
        const icon = header.querySelector('.sort-icon');
        if (icon) icon.className = 'sort-icon';
    });
    
    // Activer l'en-tête actif
    const activeHeader = table.querySelector(`th[data-sort-index="${activeColumnIndex}"]`);
    if (activeHeader) {
        activeHeader.dataset.sortDir = direction;
        const icon = activeHeader.querySelector('.sort-icon');
        if (icon) icon.className = `sort-icon ${direction}`;
    }
}

/**
 * Réinitialise l'état de tri d'un tableau
 * @param {HTMLElement} table - Tableau à réinitialiser
 */
function resetSort(table) {
    // Réinitialiser l'interface utilisateur
    table.querySelectorAll('th').forEach(header => {
        header.dataset.sortDir = '';
        const icon = header.querySelector('.sort-icon');
        if (icon) icon.className = 'sort-icon';
    });
    
    // Réinitialiser l'état interne
    table.sortState = {
        column: null,
        direction: null
    };
    
    // Notifier que le tri a été réinitialisé
    table.dispatchEvent(new CustomEvent('table:sort-reset', { bubbles: true }));
}

/**
 * Récupère la valeur de tri d'une cellule
 * @param {HTMLElement} cell - Cellule
 * @param {string} dataType - Type de données
 * @returns {*} - Valeur pour le tri
 */
function getCellValue(cell, dataType) {
    // Utiliser l'attribut data-sort-value s'il existe
    if (cell.dataset.sortValue !== undefined) {
        return cell.dataset.sortValue;
    }
    
    // Sinon utiliser le contenu textuel
    const text = cell.textContent.trim();
    
    if (dataType === 'number') {
        // Nettoyer et extraire le nombre
        return parseFloat(text.replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
    }
    
    return text;
}

/**
 * Parse une date pour le tri
 * @param {string} value - Valeur de date
 * @returns {number} - Timestamp pour comparaison
 */
function parseDateValue(value) {
    // Format français: DD/MM/YYYY
    const frMatch = String(value).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (frMatch) {
        return new Date(frMatch[3], frMatch[2] - 1, frMatch[1]).getTime();
    }
    
    // Format ISO: YYYY-MM-DD
    const isoMatch = String(value).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return new Date(isoMatch[1], isoMatch[2] - 1, isoMatch[3]).getTime();
    }
    
    // Essayer de parser directement
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
        return date.getTime();
    }
    
    return 0;
}

/**
 * Devine le type de données d'une colonne
 * @param {Array} rows - Lignes du tableau
 * @param {number} columnIndex - Index de la colonne
 * @returns {string} - Type de données ('number', 'date', ou 'text')
 */
function guessDataType(rows, columnIndex) {
    // Analyser un échantillon de cellules
    const sampleSize = Math.min(5, rows.length);
    let dateCount = 0;
    let numberCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
        if (!rows[i].cells[columnIndex]) continue;
        
        const text = rows[i].cells[columnIndex].textContent.trim();
        
        // Détecter les dates
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(text) || /^\d{4}-\d{2}-\d{2}$/.test(text)) {
            dateCount++;
        }
        // Détecter les nombres
        else if (/^-?[\d\s.,]+(\s*[€$%])?$/.test(text)) {
            numberCount++;
        }
    }
    
    // Déterminer le type selon les statistiques
    if (dateCount >= sampleSize / 2) return 'date';
    if (numberCount >= sampleSize / 2) return 'number';
    return 'text';
}

// Export par défaut pour les imports ES modules
export default { init: initTableSorter };