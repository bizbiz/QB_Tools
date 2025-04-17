// app/static/js/common/table.js
/**
 * Module de gestion des tableaux
 * Fournit des fonctionnalités pour manipuler et interagir avec les tableaux HTML
 */

/**
 * Initialise les fonctionnalités de base des tableaux
 * @param {string} tableSelector - Sélecteur pour les tableaux
 */
export function initTables(tableSelector = '.table') {
    const tables = document.querySelectorAll(tableSelector);
    
    tables.forEach(table => {
        // Vérifier si le tableau a déjà été initialisé
        if (table.dataset.initialized === 'true') return;
        
        // Marquer le tableau comme initialisé
        table.dataset.initialized = 'true';
        
        // Ajouter les fonctionnalités selon les attributs de données
        if (table.classList.contains('table-sortable')) {
            initSortableTable(table);
        }
        
        if (table.classList.contains('table-checkable')) {
            initCheckableTable(table);
        }
        
        if (table.classList.contains('table-hoverable')) {
            initHoverableTable(table);
        }
    });
}

/**
 * Initialise un tableau triable
 * @param {HTMLElement} table - Tableau à rendre triable
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
    
    // Ajouter un data-sort-value aux cellules pour le tri des caractères accentués
    rows.forEach(row => {
        const cell = row.cells[colIndex];
        if (cell && dataType === 'text') {
            const text = cell.textContent.trim();
            // Stocker la valeur de tri normalisée
            cell.dataset.sortValue = getSortValue(text);
        }
    });
    
    // Trier les lignes
    rows.sort((rowA, rowB) => {
        const cellA = rowA.cells[colIndex];
        const cellB = rowB.cells[colIndex];
        
        if (!cellA || !cellB) return 0;
        
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
            // Utiliser les valeurs de tri précalculées pour le texte
            const textA = cellA.dataset.sortValue || getSortValue(cellA.textContent.trim());
            const textB = cellB.dataset.sortValue || getSortValue(cellB.textContent.trim());
            comparison = textA.localeCompare(textB);
        }
        
        // Inverser pour le tri descendant
        return direction === 'asc' ? comparison : -comparison;
    });
    
    // Réordonner les lignes dans le tableau
    rows.forEach(row => tbody.appendChild(row));
}

/**
 * Obtient une valeur de tri pour le texte en traitant les caractères spéciaux
 * @param {string} text - Texte à normaliser
 * @returns {string} - Valeur de tri
 */
function getSortValue(text) {
    if (!text) return '';
    
    // Table de correspondance pour les caractères accentués et spéciaux
    const charMap = {
        'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
        'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
        'Ç': 'C', 'ç': 'c',
        'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
        'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
        'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
        'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
        'Ñ': 'N', 'ñ': 'n',
        'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ø': 'O',
        'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o',
        'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
        'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
        'Ý': 'Y', 'ý': 'y', 'ÿ': 'y',
        'Œ': 'OE', 'œ': 'oe'
    };
    
    // Remplacer les caractères accentués par leurs équivalents sans accent
    let normalizedText = '';
    for (let i = 0; i < text.length; i++) {
        const char = text.charAt(i);
        normalizedText += charMap[char] || char;
    }
    
    // Convertir en minuscules pour un tri insensible à la casse
    return normalizedText.toLowerCase();
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

/**
 * Initialise un tableau avec des cases à cocher
 * @param {HTMLElement} table - Tableau à initialiser
 */
function initCheckableTable(table) {
    // Chercher la case à cocher principale (en-tête)
    const headerCheckbox = table.querySelector('thead th input[type="checkbox"]');
    
    if (headerCheckbox) {
        // Chercher toutes les cases à cocher du corps du tableau
        const checkboxes = table.querySelectorAll('tbody td input[type="checkbox"]');
        
        // Ajouter l'écouteur au checkbox principal
        headerCheckbox.addEventListener('change', function() {
            checkboxes.forEach(checkbox => {
                checkbox.checked = headerCheckbox.checked;
                
                // Mettre à jour l'apparence de la ligne
                const row = checkbox.closest('tr');
                if (row) {
                    if (headerCheckbox.checked) {
                        row.classList.add('selected');
                    } else {
                        row.classList.remove('selected');
                    }
                }
            });
        });
        
        // Ajouter l'écouteur aux checkboxes individuels
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                // Mettre à jour l'apparence de la ligne
                const row = checkbox.closest('tr');
                if (row) {
                    if (checkbox.checked) {
                        row.classList.add('selected');
                    } else {
                        row.classList.remove('selected');
                    }
                }
                
                // Mettre à jour l'état du checkbox principal
                updateHeaderCheckboxState(headerCheckbox, checkboxes);
            });
        });
    }
}

/**
 * Met à jour l'état de la case à cocher d'en-tête
 * @param {HTMLElement} headerCheckbox - Case à cocher d'en-tête
 * @param {NodeList} checkboxes - Liste des cases à cocher
 */
function updateHeaderCheckboxState(headerCheckbox, checkboxes) {
    const totalCheckboxes = checkboxes.length;
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    if (checkedCount === 0) {
        headerCheckbox.checked = false;
        headerCheckbox.indeterminate = false;
    } else if (checkedCount === totalCheckboxes) {
        headerCheckbox.checked = true;
        headerCheckbox.indeterminate = false;
    } else {
        headerCheckbox.indeterminate = true;
    }
}

/**
 * Initialise un tableau avec survol amélioré
 * @param {HTMLElement} table - Tableau à initialiser
 */
function initHoverableTable(table) {
    // Ajouter des écouteurs pour le survol des lignes
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            row.classList.add('hovered');
        });
        
        row.addEventListener('mouseleave', function() {
            row.classList.remove('hovered');
        });
    });
}

/**
 * Met à jour le contenu d'un tableau
 * @param {string} tableSelector - Sélecteur du tableau
 * @param {Array} data - Données à afficher
 * @param {Function} rowRenderer - Fonction de rendu des lignes
 */
export function updateTableContent(tableSelector, data, rowRenderer) {
    const table = document.querySelector(tableSelector);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    // Vider le contenu actuel
    tbody.innerHTML = '';
    
    // Si pas de données, afficher un message
    if (!data || data.length === 0) {
        const colSpan = table.querySelector('thead tr').cells.length;
        tbody.innerHTML = `
            <tr>
                <td colspan="${colSpan}" class="text-center py-4">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle me-2"></i>
                        Aucune donnée à afficher.
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Ajouter les lignes
    data.forEach(item => {
        if (typeof rowRenderer === 'function') {
            const rowHTML = rowRenderer(item);
            tbody.insertAdjacentHTML('beforeend', rowHTML);
        } else {
            // Rendu par défaut basique
            const row = document.createElement('tr');
            
            for (const key in item) {
                const cell = document.createElement('td');
                cell.textContent = item[key];
                row.appendChild(cell);
            }
            
            tbody.appendChild(row);
        }
    });
    
    // Réinitialiser les fonctionnalités du tableau
    initTables(tableSelector);
}