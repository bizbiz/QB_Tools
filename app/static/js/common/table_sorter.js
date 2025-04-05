// app/static/js/common/table_sorter.js

/**
 * Utilitaire pour rendre les tableaux HTML triables
 * Permet de trier les tableaux en cliquant sur les en-têtes de colonnes
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser le tri pour tous les tableaux ayant la classe 'sortable-table'
    initSortableTables();
});

/**
 * Initialise tous les tableaux triables de la page
 */
function initSortableTables() {
    const sortableTables = document.querySelectorAll('.sortable-table');
    
    sortableTables.forEach(table => {
        initSortableTable(table);
    });
}

/**
 * Initialise un tableau spécifique pour le tri
 * @param {HTMLElement} table - L'élément table à rendre triable
 */
function initSortableTable(table) {
    const tableHeaders = table.querySelectorAll('th');
    
    tableHeaders.forEach((header, index) => {
        // Ignorer les colonnes non triables (avec classe 'no-sort')
        if (header.classList.contains('no-sort')) {
            return;
        }
        
        // Ajouter la classe pour le style du curseur
        header.classList.add('sortable');
        
        // Ajouter l'indicateur de tri
        const sortIcon = document.createElement('span');
        sortIcon.className = 'sort-icon';
        header.appendChild(sortIcon);
        
        // Ajouter l'événement de clic
        header.addEventListener('click', () => {
            sortTable(table, index);
        });
    });
}

/**
 * Trie un tableau selon une colonne spécifique
 * @param {HTMLElement} table - Le tableau à trier
 * @param {number} columnIndex - L'index de la colonne à trier
 */
function sortTable(table, columnIndex) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const headers = table.querySelectorAll('th');
    
    // Déterminer la direction du tri
    const header = headers[columnIndex];
    const sortIcon = header.querySelector('.sort-icon');
    
    let sortDirection = 'asc';
    // Si la même colonne est déjà triée, inverser la direction
    if (sortIcon.classList.contains('asc')) {
        sortDirection = 'desc';
        sortIcon.classList.remove('asc');
        sortIcon.classList.add('desc');
    } else {
        sortIcon.classList.remove('desc');
        sortIcon.classList.add('asc');
    }
    
    // Réinitialiser les autres en-têtes
    headers.forEach(h => {
        if (h !== header) {
            const icon = h.querySelector('.sort-icon');
            if (icon) {
                icon.classList.remove('asc', 'desc');
            }
        }
    });
    
    // Déterminer le type de données de la colonne
    const dataType = header.dataset.type || detectColumnType(rows, columnIndex);
    
    // Trier les lignes en fonction du type de données
    rows.sort((rowA, rowB) => {
        // S'assurer que les cellules existent
        if (!rowA.cells[columnIndex] || !rowB.cells[columnIndex]) {
            return 0;
        }
        
        // Obtenir les valeurs pour la comparaison
        const valueA = getCellValue(rowA.cells[columnIndex], dataType);
        const valueB = getCellValue(rowB.cells[columnIndex], dataType);
        
        // Effectuer la comparaison en fonction du type
        let result;
        
        if (dataType === 'date') {
            // Pour les dates, comparer les timestamps
            const timeA = valueA instanceof Date ? valueA.getTime() : 0;
            const timeB = valueB instanceof Date ? valueB.getTime() : 0;
            result = timeA - timeB;
        } else if (dataType === 'number') {
            // Pour les nombres, comparaison numérique
            result = valueA - valueB;
        } else {
            // Pour le texte, comparaison lexicographique
            result = String(valueA).localeCompare(String(valueB), undefined, { sensitivity: 'base' });
        }
        
        // Inverser le résultat si tri descendant
        return sortDirection === 'asc' ? result : -result;
    });
    
    // Réattacher les lignes dans le nouvel ordre
    rows.forEach(row => tbody.appendChild(row));
}

/**
 * Détecte automatiquement le type de données d'une colonne
 * @param {Array} rows - Tableau des lignes
 * @param {number} columnIndex - Index de la colonne
 * @returns {string} - Type détecté ('date', 'number', ou 'text')
 */
function detectColumnType(rows, columnIndex) {
    // Vérifier quelques cellules pour déterminer le type
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
        if (!rows[i].cells[columnIndex]) continue;
        
        const text = rows[i].cells[columnIndex].textContent.trim();
        
        // Vérifier si c'est une date (format DD/MM/YYYY)
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
            return 'date';
        }
        
        // Vérifier si c'est un nombre (avec symbole de devise ou pourcentage)
        if (/^-?[\d\s.,]+(\s*[€$%])?$/.test(text)) {
            return 'number';
        }
    }
    
    // Par défaut, c'est du texte
    return 'text';
}

/**
 * Obtient la valeur d'une cellule selon son type pour le tri
 * @param {HTMLElement} cell - La cellule du tableau
 * @param {string} dataType - Le type de données ('date', 'number', ou 'text')
 * @returns {*} - La valeur formatée pour le tri
 */
function getCellValue(cell, dataType) {
    // Obtenir le texte de la cellule
    let text = cell.textContent.trim();
    
    // Pour une cellule vide
    if (!text) {
        return dataType === 'number' ? -Infinity : '';
    }
    
    // Si la cellule contient plusieurs lignes, prendre la première significative
    if (text.includes('\n')) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        text = lines.length > 0 ? lines[0] : text;
    }
    
    // Pour les cellules avec badges ou autres éléments, essayer d'extraire le texte principal
    const badge = cell.querySelector('.badge, .category-badge, .flag-badge');
    if (badge) {
        text = badge.textContent.trim();
    }
    
    // Traiter selon le type de données
    switch (dataType) {
        case 'date':
            return parseDateString(text);
        case 'number':
            return parseNumberString(text);
        default:
            // Texte: normaliser (enlever accents) et mettre en minuscules
            return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }
}

/**
 * Parse une chaîne de date au format DD/MM/YYYY
 * @param {string} dateStr - La chaîne à parser
 * @returns {Date|string} - Date parsée ou chaîne originale si échec
 */
function parseDateString(dateStr) {
    // Rechercher le premier motif de date dans la chaîne
    const dateMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    
    if (dateMatch) {
        const [, day, month, year] = dateMatch;
        try {
            // Construire un objet Date valide
            return new Date(`${year}-${month}-${day}`);
        } catch (e) {
            console.warn('Erreur de parsing de date:', dateStr);
        }
    }
    
    return dateStr; // Retourner la chaîne originale si le format ne correspond pas
}

/**
 * Parse une chaîne contenant un nombre (avec potentiellement un symbole)
 * @param {string} numStr - La chaîne à parser
 * @returns {number} - Le nombre extrait ou 0 si échec
 */
function parseNumberString(numStr) {
    // Nettoyer la chaîne: garder uniquement chiffres, point, virgule, signe
    let cleanStr = numStr.replace(/[^\d,.\-+]/g, '');
    
    // Remplacer la virgule par un point pour le parsing
    cleanStr = cleanStr.replace(',', '.');
    
    // Essayer de parser en nombre
    const parsedNum = parseFloat(cleanStr);
    
    return isNaN(parsedNum) ? 0 : parsedNum;
}

/**
 * Rend un tableau spécifique triable (pour une utilisation externe)
 * @param {string} tableSelector - Sélecteur CSS du tableau
 */
function makeSortable(tableSelector) {
    const table = document.querySelector(tableSelector);
    if (table) {
        table.classList.add('sortable-table');
        initSortableTable(table);
    }
}

// Exposer les fonctions pour une utilisation externe
window.TableSorter = {
    init: initSortableTables,
    makeSortable: makeSortable,
    sortTable: sortTable
};