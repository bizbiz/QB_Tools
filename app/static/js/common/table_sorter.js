// app/static/js/common/table_sorter.js

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
        header.addEventListener('click', function() {
            // Vérifier l'état de tri actuel de cette colonne
            let currentDirection = '';
            if (sortIcon.classList.contains('asc')) {
                currentDirection = 'asc';
            } else if (sortIcon.classList.contains('desc')) {
                currentDirection = 'desc';
            }
            
            // Déterminer la nouvelle direction
            let newDirection;
            if (currentDirection === '') {
                newDirection = 'asc'; // Premier clic: tri ascendant
            } else if (currentDirection === 'asc') {
                newDirection = 'desc'; // Deuxième clic: tri descendant
            } else {
                newDirection = 'asc'; // Troisième clic: retour au tri ascendant
            }
            
            // Exécuter le tri avec la direction calculée
            sortTableByColumn(table, index, newDirection);
        });
    });
}

/**
 * Trie un tableau selon une colonne spécifique et une direction donnée
 * @param {HTMLElement} table - Le tableau à trier
 * @param {number} columnIndex - L'index de la colonne à trier
 * @param {string} direction - Direction du tri ('asc' ou 'desc')
 */
function sortTableByColumn(table, columnIndex, direction) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const headers = table.querySelectorAll('th');
    
    // Mettre à jour l'affichage des icônes de tri
    headers.forEach((header, i) => {
        const icon = header.querySelector('.sort-icon');
        if (icon) {
            icon.classList.remove('asc', 'desc');
            if (i === columnIndex) {
                icon.classList.add(direction);
            }
        }
    });
    
    // Déterminer le type de données
    const header = headers[columnIndex];
    let dataType = 'text';
    
    // Utiliser l'attribut data-type s'il est défini
    if (header.dataset.type) {
        dataType = header.dataset.type;
    } 
    // Sinon, essayer de deviner le type de données
    else {
        const headerText = header.textContent.trim().toLowerCase();
        if (headerText.includes('date')) {
            dataType = 'date';
        } else if (headerText.includes('montant') || headerText.includes('prix') || 
                 headerText.includes('total') || headerText.includes('€')) {
            dataType = 'number';
        }
    }
    
    // Trier les lignes
    rows.sort((a, b) => {
        // Protection contre les cellules manquantes
        if (!a.cells[columnIndex] || !b.cells[columnIndex]) {
            return 0;
        }
        
        const aValue = getCellValue(a.cells[columnIndex], dataType);
        const bValue = getCellValue(b.cells[columnIndex], dataType);
        
        let comparison = 0;
        
        if (dataType === 'number') {
            // Conversion en nombres pour la comparaison
            const aNum = parseFloat(aValue.replace(/[^\d.-]/g, '').replace(',', '.')) || 0;
            const bNum = parseFloat(bValue.replace(/[^\d.-]/g, '').replace(',', '.')) || 0;
            comparison = aNum - bNum;
        } 
        else if (dataType === 'date') {
            // Conversion des dates pour la comparaison
            const aDate = parseDate(aValue);
            const bDate = parseDate(bValue);
            comparison = aDate - bDate;
        } 
        else {
            // Comparaison de texte normale
            comparison = aValue.localeCompare(bValue, undefined, {sensitivity: 'base'});
        }
        
        // Inverser la comparaison si le tri est descendant
        return direction === 'asc' ? comparison : -comparison;
    });
    
    // Réappliquer les lignes triées
    rows.forEach(row => tbody.appendChild(row));
}

/**
 * Extrait la valeur d'une cellule adaptée pour le tri
 */
function getCellValue(cell, dataType) {
    let value = cell.textContent.trim();
    
    // Pour les cellules contenant des badges ou éléments similaires
    if (cell.querySelector('.badge, .category-badge, .flag-badge')) {
        const badge = cell.querySelector('.badge, .category-badge, .flag-badge');
        value = badge.textContent.trim();
    }
    
    // Gérer les montants négatifs
    if (dataType === 'number' && value.indexOf('-') >= 0) {
        // Assurer que le signe négatif est au début
        value = '-' + value.replace(/[^0-9,.]/g, '');
    }
    
    return value;
}

/**
 * Parse une date au format français DD/MM/YYYY
 */
function parseDate(dateStr) {
    const match = dateStr.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        let year = parseInt(match[3], 10);
        
        // Ajuster l'année si format court
        if (year < 100) {
            year += year < 50 ? 2000 : 1900;
        }
        
        return new Date(year, month, day).getTime();
    }
    
    return 0; // Valeur par défaut si le format n'est pas reconnu
}

// Exposer les fonctions pour une utilisation externe
window.TableSorter = {
    init: initSortableTables,
    makeSortable: function(selector) {
        const table = document.querySelector(selector);
        if (table) {
            table.classList.add('sortable-table');
            initSortableTable(table);
        }
    }
};