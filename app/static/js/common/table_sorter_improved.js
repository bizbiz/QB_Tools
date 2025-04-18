// app/static/js/common/table_sorter_improved.js
/**
 * Module amélioré pour le tri des tableaux
 * Version optimisée du module table_sorter_simple.js avec une meilleure détection des types
 * et un traitement correct des dates et des descriptions
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
    // Ne pas réinitialiser si déjà initialisé ou si le tableau est configuré pour AJAX
    if (table.dataset.initialized === 'true' || table.dataset.ajaxSortable === 'true') return;
    
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
    
    console.log(`Tri de la colonne ${colIndex} (${dataType}) en ${direction}`);
    
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
            comparison = parseFloat(valA) - parseFloat(valB);
        } else if (dataType === 'date') {
            // Pour les dates, convertir en timestamps pour comparaison
            const dateA = parseDateValue(valA);
            const dateB = parseDateValue(valB);
            comparison = dateA - dateB;
        } else {
            // Pour le texte, faire une comparaison insensible à la casse
            comparison = String(valA).localeCompare(String(valB), undefined, {sensitivity: 'base'});
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
    // Utiliser data-sort-value si disponible (prioritaire)
    if (cell.hasAttribute('data-sort-value')) {
        const value = cell.getAttribute('data-sort-value');
        
        if (dataType === 'number') {
            return parseFloat(value.replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
        } 
        
        return value;
    }
    
    // Sinon, utiliser le contenu de la cellule
    const text = cell.textContent.trim();
    
    if (dataType === 'number') {
        // Extraire le nombre (ignorer devise, espace, etc.)
        return parseFloat(text.replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
    }
    
    // Pour les dates et le texte, retourner le texte brut
    return text;
}

/**
 * Parse une valeur de date pour la comparaison
 * @param {string} dateValue - Valeur de date
 * @returns {number} - Timestamp pour comparaison
 */
function parseDateValue(dateValue) {
    // Cas spécial: valeur numérique (comme YYYYMMDD)
    if (!isNaN(dateValue) && dateValue.length >= 8) {
        return parseInt(dateValue, 10);
    }
    
    // Format français: DD/MM/YYYY
    const frMatch = String(dateValue).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (frMatch) {
        return new Date(frMatch[3], frMatch[2] - 1, frMatch[1]).getTime();
    }
    
    // Format anglais: YYYY-MM-DD ou MM/DD/YYYY
    const standardDate = new Date(dateValue);
    if (!isNaN(standardDate.getTime())) {
        return standardDate.getTime();
    }
    
    // Si aucun format reconnu, retourner 0
    return 0;
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
    
    // Vérifier d'abord l'en-tête pour des indices
    const headerCell = rows[0].closest('table').querySelector('thead tr').cells[colIndex];
    const headerText = headerCell ? headerCell.textContent.trim().toLowerCase() : '';
    
    // Mot-clés qui indiquent des types de données
    if (/date|jour/.test(headerText)) {
        return 'date';
    }
    if (/montant|prix|somme|euro|amount|price|value/.test(headerText)) {
        return 'number';
    }
    
    for (let i = 0; i < sampleSize; i++) {
        if (i >= rows.length) break;
        
        const cell = rows[i].cells[colIndex];
        if (!cell) continue;
        
        // Vérifier d'abord data-sort-value
        let text = cell.hasAttribute('data-sort-value') 
            ? cell.getAttribute('data-sort-value') 
            : cell.textContent.trim();
        
        // Date au format français
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
            dateCount++;
        }
        // Date au format ISO
        else if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
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
    sort: sortTable,
    getType: guessDataType,
    getCellValue: getCellValue
};