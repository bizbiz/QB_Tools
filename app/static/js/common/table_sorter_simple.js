// app/static/js/common/table_sorter_simple.js
/**
 * Module simplifié pour le tri des tableaux
 * Fournit des fonctionnalités essentielles sans les problèmes de la version précédente
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les tableaux triables
    initAllTables();
});

/**
 * Initialise tous les tableaux triables sur la page
 */
function initAllTables() {
    document.querySelectorAll('.sortable-table').forEach(initSortableTable);
}

/**
 * Initialise un tableau triable spécifique
 * @param {HTMLElement} table - Tableau à rendre triable
 */
function initSortableTable(table) {
    // Ne pas réinitialiser si déjà initialisé
    if (table.dataset.initialized === 'true') return;
    
    // Marquer comme initialisé
    table.dataset.initialized = 'true';
    
    // Ajouter l'écouteur aux en-têtes triables
    table.querySelectorAll('th:not(.no-sort)').forEach(function(th, index) {
        // Supprimer tout écouteur existant pour éviter la duplication
        th.removeEventListener('click', sortClickHandler);
        
        // Ajouter l'attribut d'index de colonne s'il n'existe pas
        if (!th.hasAttribute('data-sort-index')) {
            th.setAttribute('data-sort-index', index);
        }
        
        // Ajouter la classe pour le style
        th.classList.add('sortable');
        
        // Ajouter l'icône de tri si absente
        if (!th.querySelector('.sort-icon')) {
            const icon = document.createElement('span');
            icon.className = 'sort-icon';
            th.appendChild(icon);
        }
        
        // Ajouter l'écouteur d'événement
        th.addEventListener('click', sortClickHandler);
    });
}

/**
 * Gère le clic sur un en-tête pour le tri
 * @param {Event} e - L'événement de clic
 */
function sortClickHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const th = this;
    const table = th.closest('table');
    const colIndex = parseInt(th.getAttribute('data-sort-index'), 10);
    
    // Déterminer la direction de tri
    let dir = th.getAttribute('data-sort-dir') || '';
    
    if (dir === '') {
        dir = 'asc';
    } else if (dir === 'asc') {
        dir = 'desc';
    } else {
        dir = 'asc';
    }
    
    // Réinitialiser toutes les colonnes
    table.querySelectorAll('th').forEach(function(header) {
        header.setAttribute('data-sort-dir', '');
        const icon = header.querySelector('.sort-icon');
        if (icon) {
            icon.className = 'sort-icon';
        }
    });
    
    // Appliquer la nouvelle direction
    th.setAttribute('data-sort-dir', dir);
    const icon = th.querySelector('.sort-icon');
    if (icon) {
        icon.className = 'sort-icon ' + dir;
    }
    
    // Effectuer le tri
    sortTable(table, colIndex, dir);
}

/**
 * Trie un tableau par colonne
 * @param {HTMLElement} table - Le tableau à trier
 * @param {number} colIndex - L'index de la colonne à trier
 * @param {string} direction - La direction du tri ('asc' ou 'desc')
 */
function sortTable(table, colIndex, direction) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.rows);
    
    // Déterminer le type de données de la colonne
    const headerCell = table.querySelector('thead').rows[0].cells[colIndex];
    const dataType = headerCell.getAttribute('data-type') || guessDataType(rows, colIndex);
    
    // Trier les lignes
    rows.sort(function(rowA, rowB) {
        // Obtenir les cellules à comparer
        const cellA = rowA.cells[colIndex];
        const cellB = rowB.cells[colIndex];
        
        if (!cellA || !cellB) return 0;
        
        // Obtenir les valeurs à comparer
        const valA = getCellValue(cellA, dataType);
        const valB = getCellValue(cellB, dataType);
        
        // Comparer selon le type
        let comparison;
        
        if (dataType === 'number') {
            comparison = valA - valB;
        } else if (dataType === 'date') {
            comparison = new Date(valA) - new Date(valB);
        } else {
            comparison = String(valA).localeCompare(String(valB));
        }
        
        // Inverser si tri descendant
        return direction === 'asc' ? comparison : -comparison;
    });
    
    // Réorganiser les lignes
    rows.forEach(function(row) {
        tbody.appendChild(row);
    });
}

/**
 * Obtient la valeur de tri d'une cellule
 * @param {HTMLElement} cell - La cellule
 * @param {string} dataType - Le type de données
 * @returns {*} - La valeur à utiliser pour le tri
 */
function getCellValue(cell, dataType) {
    // Utiliser data-sort-value si disponible
    if (cell.hasAttribute('data-sort-value')) {
        const value = cell.getAttribute('data-sort-value');
        
        if (dataType === 'number') {
            return parseFloat(value.replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
        } else if (dataType === 'date') {
            // Traiter les dates au format français et anglais
            return parseDate(value);
        }
        
        return value;
    }
    
    // Sinon, utiliser le contenu de la cellule
    const text = cell.textContent.trim();
    
    if (dataType === 'number') {
        // Extraire le nombre (ignorer devise, espace, etc.)
        return parseFloat(text.replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
    } else if (dataType === 'date') {
        // Traiter les dates
        return parseDate(text);
    }
    
    // Texte simple
    return text.toLowerCase();
}

/**
 * Convertit une date textuelle en timestamp
 * @param {string} dateStr - Chaîne de date
 * @returns {number} - Timestamp Unix
 */
function parseDate(dateStr) {
    // Gérer le format français (JJ/MM/AAAA)
    const frMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (frMatch) {
        return new Date(frMatch[3], frMatch[2] - 1, frMatch[1]).getTime();
    }
    
    // Format ISO ou valeur numérique directe
    if (!isNaN(dateStr)) {
        return parseInt(dateStr, 10);
    }
    
    // Essayer de parser normalement
    return new Date(dateStr).getTime() || 0;
}

/**
 * Devine le type de données d'une colonne
 * @param {Array} rows - Lignes du tableau
 * @param {number} colIndex - Index de la colonne
 * @returns {string} - Type détecté ('number', 'date', ou 'text')
 */
function guessDataType(rows, colIndex) {
    // Examiner quelques cellules pour déterminer le type
    const sampleSize = Math.min(5, rows.length);
    let dateCount = 0;
    let numberCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
        if (i >= rows.length) break;
        
        const cell = rows[i].cells[colIndex];
        if (!cell) continue;
        
        const text = cell.textContent.trim();
        
        // Date au format français
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
            dateCount++;
        }
        // Nombre (avec ou sans symbole monétaire)
        else if (/^-?[\d\s.,]+(\s*[€$])?$/.test(text)) {
            numberCount++;
        }
    }
    
    // Déterminer le type basé sur les statistiques
    if (dateCount >= sampleSize / 2) return 'date';
    if (numberCount >= sampleSize / 2) return 'number';
    return 'text';
}

// Exposer l'API pour utilisation externe
window.TableSorter = {
    init: initAllTables,
    initTable: initSortableTable,
    sort: sortTable
};