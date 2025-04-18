// app/static/js/common/table_sorter_improved.js
/**
 * Module amélioré pour le tri des tableaux
 * Corrige les problèmes de tri et de détection des colonnes
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
    // Éviter la double initialisation
    if (table.dataset.initialized === 'true' || table.dataset.ajaxSortable === 'true') return;
    
    console.log("Initialisation du tableau triable:", table.id || "tableau sans ID");
    
    // Marquer comme initialisé
    table.dataset.initialized = 'true';
    
    // Récupérer les en-têtes triables et leur attribuer des index explicites
    const headers = table.querySelectorAll('th:not(.no-sort)');
    headers.forEach(function(th, index) {
        // Supprimer les gestionnaires existants
        th.removeEventListener('click', sortClickHandler);
        
        // Ajouter l'attribut d'index de colonne s'il n'existe pas
        if (!th.dataset.sortIndex) {
            th.dataset.sortIndex = index;
        }
        
        // Si aucune colonne de tri n'est définie, utiliser le texte de l'en-tête
        if (!th.dataset.sortColumn) {
            const headerText = th.textContent.trim().toLowerCase();
            let columnName = headerText.replace(/\s+/g, '_');
            th.dataset.sortColumn = columnName;
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
    
    // Logging pour le débogage
    console.log("En-têtes triables configurés:", headers.length);
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
    const colIndex = parseInt(th.dataset.sortIndex, 10);
    const sortColumn = th.dataset.sortColumn;
    
    console.log(`Clic sur l'en-tête de tri: colonne=${sortColumn}, index=${colIndex}`);
    
    // Déterminer la direction de tri
    let dir = th.dataset.sortDir || '';
    
    if (dir === '') {
        dir = 'asc';
    } else if (dir === 'asc') {
        dir = 'desc';
    } else {
        dir = 'asc';
    }
    
    // Réinitialiser toutes les colonnes
    table.querySelectorAll('th').forEach(function(header) {
        header.dataset.sortDir = '';
        const icon = header.querySelector('.sort-icon');
        if (icon) {
            icon.className = 'sort-icon';
        }
    });
    
    // Appliquer la nouvelle direction
    th.dataset.sortDir = dir;
    const icon = th.querySelector('.sort-icon');
    if (icon) {
        icon.className = 'sort-icon ' + dir;
    }
    
    // Vérifier si le tableau est configuré pour AJAX
    if (table.dataset.ajaxSortable === 'true') {
        // Si oui, délencher le tri AJAX
        if (typeof window.triggerAjaxSort === 'function') {
            window.triggerAjaxSort(sortColumn, dir);
        } else {
            console.warn("Fonction triggerAjaxSort non disponible");
            
            // Fallback: mettre à jour les champs cachés et soumettre le formulaire
            const filterForm = document.getElementById('filter-form');
            if (filterForm) {
                const sortInput = filterForm.querySelector('input[name="sort"]');
                const orderInput = filterForm.querySelector('input[name="order"]');
                
                if (sortInput && orderInput) {
                    sortInput.value = sortColumn;
                    orderInput.value = dir;
                    
                    if (typeof window.submitFiltersAjax === 'function') {
                        window.submitFiltersAjax();
                    }
                }
            }
        }
    } else {
        // Sinon, effectuer le tri côté client
        sortTable(table, colIndex, dir);
    }
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
    
    // Ignorer si aucune ligne ou si une seule ligne à trier
    if (rows.length <= 1) return;
    
    // Déterminer le type de données de la colonne
    const headerCell = table.querySelector('thead').rows[0].cells[colIndex];
    const dataType = headerCell.dataset.type || guessDataType(table, colIndex);
    
    console.log(`Tri de la colonne ${colIndex} (${dataType}) en ${direction}`);
    
    // Journaliser quelques valeurs de tri pour le débogage
    const sampleSize = Math.min(3, rows.length);
    for (let i = 0; i < sampleSize; i++) {
        const cell = rows[i].cells[colIndex];
        if (cell) {
            const sortValue = getCellValue(cell, dataType);
            console.log(`Échantillon de valeur de tri ${i+1}: ${sortValue}`);
        }
    }
    
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
    
    console.log(`Tri terminé: ${rows.length} lignes réorganisées`);
}

/**
 * Obtient la valeur de tri d'une cellule
 * @param {HTMLElement} cell - La cellule
 * @param {string} dataType - Le type de données
 * @returns {*} - La valeur à utiliser pour le tri
 */
function getCellValue(cell, dataType) {
    // Priorité absolue à data-sort-value s'il est défini
    if (cell.dataset.sortValue) {
        return cell.dataset.sortValue;
    }
    
    // Sinon, utiliser le contenu de la cellule
    const text = cell.textContent.trim();
    
    if (dataType === 'number') {
        // Extraire le nombre (ignorer devise, espace, etc.)
        const numStr = text.replace(/[^\d.,\-]/g, '').replace(',', '.');
        return parseFloat(numStr) || 0;
    } else if (dataType === 'date') {
        // Pour les dates, retourner le texte pour analyse ultérieure
        return text;
    }
    
    // Pour le texte, retourner le texte brut
    return text;
}

/**
 * Parse une valeur de date pour la comparaison
 * @param {string} dateValue - Valeur de date
 * @returns {number} - Timestamp pour comparaison
 */
function parseDateValue(dateValue) {
    // Format français: DD/MM/YYYY
    const frMatch = String(dateValue).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (frMatch) {
        return new Date(frMatch[3], frMatch[2] - 1, frMatch[1]).getTime();
    }
    
    // Valeur numérique directe (YYYYMMDD)
    if (/^\d{8}$/.test(dateValue)) {
        const year = dateValue.substring(0, 4);
        const month = dateValue.substring(4, 6) - 1;
        const day = dateValue.substring(6, 8);
        return new Date(year, month, day).getTime();
    }
    
    // Format standard ISO: YYYY-MM-DD
    const isoMatch = String(dateValue).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return new Date(isoMatch[1], isoMatch[2] - 1, isoMatch[3]).getTime();
    }
    
    // Si aucun format reconnu, essayer de parser directement
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
        return date.getTime();
    }
    
    // Si tout échoue, retourner 0
    return 0;
}

/**
 * Devine le type de données d'une colonne
 * @param {HTMLElement} table - Table à analyser
 * @param {number} colIndex - Index de la colonne
 * @returns {string} - Type détecté ('number', 'date', ou 'text')
 */
function guessDataType(table, colIndex) {
    // Vérifier d'abord l'attribut data-type de l'en-tête
    const header = table.querySelector(`thead tr th:nth-child(${colIndex + 1})`);
    if (header && header.dataset.type) {
        return header.dataset.type;
    }
    
    // Examiner quelques cellules pour déterminer le type
    const tbody = table.querySelector('tbody');
    if (!tbody || !tbody.rows || tbody.rows.length === 0) return 'text';
    
    const sampleSize = Math.min(5, tbody.rows.length);
    let dateCount = 0;
    let numberCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
        if (i >= tbody.rows.length) break;
        
        const row = tbody.rows[i];
        if (!row.cells[colIndex]) continue;
        
        const cell = row.cells[colIndex];
        const text = cell.textContent.trim();
        
        // Date au format français (DD/MM/YYYY)
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
            dateCount++;
        }
        // Date au format ISO (YYYY-MM-DD)
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

/**
 * Fonction pour configurer le tri AJAX
 * @param {string} tableSelector - Sélecteur du tableau
 * @param {Object} options - Options de configuration
 */
function setupAjaxSort(tableSelector, options = {}) {
    const table = document.querySelector(tableSelector);
    if (!table) return;
    
    // Marquer le tableau comme utilisant le tri AJAX
    table.dataset.ajaxSortable = 'true';
    
    // Configuration par défaut
    const config = {
        formSelector: '#filter-form',
        sortParam: 'sort',
        orderParam: 'order',
        callbackFunction: 'submitFiltersAjax',
        ...options
    };
    
    // Stocker la configuration dans l'élément
    table.ajaxSortConfig = config;
    
    // Initialiser les en-têtes de tri
    initSortableTable(table);
    
    // Exposer la fonction de déclenchement du tri AJAX
    window.triggerAjaxSort = function(column, direction) {
        const form = document.querySelector(config.formSelector);
        if (!form) return;
        
        // Mettre à jour les champs de tri
        const sortInput = form.querySelector(`input[name="${config.sortParam}"]`);
        const orderInput = form.querySelector(`input[name="${config.orderParam}"]`);
        
        if (sortInput && orderInput) {
            console.log(`Mise à jour du tri AJAX: ${column} ${direction}`);
            sortInput.value = column;
            orderInput.value = direction;
            
            // Appeler la fonction de soumission
            if (typeof window[config.callbackFunction] === 'function') {
                window[config.callbackFunction]();
            } else {
                console.warn(`Fonction ${config.callbackFunction} non disponible`);
            }
        }
    };
}

// Exposer l'API pour utilisation externe
window.TableSorter = {
    init: initAllTables,
    initTable: initSortableTable,
    sort: sortTable,
    getType: guessDataType,
    getCellValue: getCellValue,
    setupAjaxSort: setupAjaxSort
};