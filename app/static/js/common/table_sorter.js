// app/static/js/common/table_sorter.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser tous les tableaux triables
    document.querySelectorAll('.sortable-table').forEach(initSortableTable);
});

/**
 * Initialise un tableau triable
 * @param {HTMLElement} table - Table à rendre triable
 */
function initSortableTable(table) {
    // Ajouter des en-têtes triables
    table.querySelectorAll('th:not(.no-sort)').forEach((th, index) => {
        // Ajouter des attributs de données
        th.dataset.sortIndex = index;
        th.dataset.sortDir = ''; // '', 'asc', ou 'desc'
        
        // Ajouter la classe pour le style
        th.classList.add('sortable');
        
        // Ajouter l'indicateur visuel
        const icon = document.createElement('span');
        icon.className = 'sort-icon';
        th.appendChild(icon);
        
        // Ajouter l'écouteur d'événement
        th.addEventListener('click', handleHeaderClick);
    });
}

/**
 * Gère le clic sur un en-tête de colonne
 * @param {Event} e - Événement de clic
 */
function handleHeaderClick(e) {
    const th = e.currentTarget;
    const table = th.closest('table');
    const index = parseInt(th.dataset.sortIndex);
    
    // Déterminer la nouvelle direction de tri
    let dir = th.dataset.sortDir;
    if (dir === '') dir = 'asc';
    else if (dir === 'asc') dir = 'desc';
    else dir = 'asc';
    
    // Réinitialiser tous les autres en-têtes
    table.querySelectorAll('th.sortable').forEach(header => {
        header.dataset.sortDir = '';
        header.querySelector('.sort-icon').className = 'sort-icon';
    });
    
    // Mettre à jour la direction actuelle
    th.dataset.sortDir = dir;
    th.querySelector('.sort-icon').className = `sort-icon ${dir}`;
    
    // Réaliser le tri
    sortTableByColumn(table, index, dir);
}

/**
 * Trie un tableau par colonne
 * @param {HTMLElement} table - Tableau à trier
 * @param {number} colIndex - Index de la colonne à trier
 * @param {string} direction - Direction du tri ('asc' ou 'desc')
 */
function sortTableByColumn(table, colIndex, direction) {
    // Récupérer le type de données de la colonne
    const headerRow = table.querySelector('thead tr');
    const header = headerRow.cells[colIndex];
    const dataType = header.dataset.type || guessDataType(table, colIndex);
    
    // Récupérer les lignes et les trier
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.rows);
    
    // Créer un collator pour le tri de texte qui respecte les règles linguistiques
    const collator = new Intl.Collator(undefined, { 
        sensitivity: 'base',    // Insensible à la casse et aux accents
        numeric: true,          // Pour que "10" vienne après "2"
        usage: 'sort'           // Optimisé pour le tri
    });
    
    rows.sort((rowA, rowB) => {
        // Extraire les valeurs des cellules
        const cellA = rowA.cells[colIndex];
        const cellB = rowB.cells[colIndex];
        
        if (!cellA || !cellB) return 0;
        
        // Comparer selon le type de données
        let comparison = 0;
        
        if (dataType === 'number') {
            // Traiter les nombres
            const valA = extractNumber(cellA.textContent);
            const valB = extractNumber(cellB.textContent);
            comparison = valA - valB;
        } 
        else if (dataType === 'date') {
            // Traiter les dates
            const dateA = parseDate(cellA.textContent);
            const dateB = parseDate(cellB.textContent);
            comparison = dateA - dateB;
        } 
        else {
            // Traiter le texte avec le collator pour un tri correct des accents
            const textA = getCellTextContent(cellA);
            const textB = getCellTextContent(cellB);
            comparison = collator.compare(textA, textB);
        }
        
        // Inverser pour le tri descendant
        return direction === 'asc' ? comparison : -comparison;
    });
    
    // Réordonner les lignes dans le tableau
    rows.forEach(row => tbody.appendChild(row));
}

/**
 * Extrait le contenu textuel d'une cellule, même si elle contient des éléments HTML
 * @param {HTMLElement} cell - Cellule de tableau
 * @returns {string} - Contenu textuel
 */
function getCellTextContent(cell) {
    // Pour les cellules avec des badges ou autres éléments HTML
    let text = cell.textContent.trim();
    
    // Pour les cellules avec badges spécifiques
    const badge = cell.querySelector('.badge, .category-badge, .flag-badge');
    if (badge) {
        text = badge.textContent.trim();
    }
    
    return text;
}

/**
 * Devine le type de données d'une colonne
 * @param {HTMLElement} table - Table à analyser
 * @param {number} colIndex - Index de la colonne
 * @returns {string} - Type de données ('number', 'date', ou 'text')
 */
function guessDataType(table, colIndex) {
    const tbody = table.querySelector('tbody');
    const headerCell = table.querySelector('thead tr').cells[colIndex];
    const headerText = headerCell.textContent.toLowerCase();
    
    // Vérifier le texte de l'en-tête
    if (headerText.includes('date')) return 'date';
    if (headerText.includes('montant') || headerText.includes('prix') || headerText.includes('coût')) return 'number';
    
    // Analyser quelques cellules de données
    const rows = Array.from(tbody.rows).slice(0, 5); // Examiner les 5 premières lignes
    
    for (const row of rows) {
        if (!row.cells[colIndex]) continue;
        
        const text = row.cells[colIndex].textContent.trim();
        
        // Vérifier si c'est une date (format français)
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return 'date';
        
        // Vérifier si c'est un nombre (avec ou sans symbole de devise)
        if (/^-?[\d\s.,]+(\s*[€$])?$/.test(text)) return 'number';
    }
    
    // Par défaut, considérer comme du texte
    return 'text';
}

/**
 * Extrait un nombre d'une chaîne de texte
 * @param {string} text - Texte contenant potentiellement un nombre
 * @returns {number} - Nombre extrait ou 0
 */
function extractNumber(text) {
    // Nettoyer le texte et extraire le nombre
    text = text.trim();
    
    // Vérifier si c'est négatif
    const isNegative = text.includes('-');
    
    // Supprimer tout sauf les chiffres, le point et la virgule
    text = text.replace(/[^\d.,]/g, '');
    
    // Remplacer la virgule par un point pour le parsing
    text = text.replace(',', '.');
    
    // Parser le nombre
    let value = parseFloat(text) || 0;
    
    // Appliquer le signe négatif si nécessaire
    if (isNegative) value = -Math.abs(value);
    
    return value;
}

/**
 * Parse une date au format français (DD/MM/YYYY)
 * @param {string} text - Texte contenant une date
 * @returns {number} - Timestamp de la date ou 0
 */
function parseDate(text) {
    // Extraire la date au format DD/MM/YYYY
    const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // Mois commencent à 0 en JS
        const year = parseInt(match[3], 10);
        
        // Créer la date et retourner le timestamp
        return new Date(year, month, day).getTime();
    }
    
    return 0;
}

// Exposer les fonctions pour une utilisation externe
window.TableSorter = {
    init: function() {
        document.querySelectorAll('.sortable-table').forEach(initSortableTable);
    },
    makeSortable: function(selector) {
        const table = document.querySelector(selector);
        if (table) {
            table.classList.add('sortable-table');
            initSortableTable(table);
        }
    }
};