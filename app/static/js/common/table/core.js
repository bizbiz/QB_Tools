// app/static/js/common/table/core.js
/**
 * Fonctionnalités de base communes à tous les tableaux
 * Indépendantes du mécanisme de tri
 */

/**
 * Initialise les fonctionnalités de base pour tous les tableaux
 * @param {string|HTMLElement} [selector='table.enhanced-table'] - Sélecteur pour les tableaux à améliorer
 */
export function initTableCore(selector = 'table.enhanced-table') {
    const tables = typeof selector === 'string' 
        ? document.querySelectorAll(selector) 
        : [selector].filter(el => el instanceof HTMLElement);
    
    tables.forEach(table => {
        // Éviter la double initialisation
        if (table.dataset.coreInitialized === 'true') return;
        
        // Marquer comme initialisé
        table.dataset.coreInitialized = 'true';
        
        // Ajouter des fonctionnalités de base
        addResponsiveFeatures(table);
        addAccessibilityFeatures(table);
        setupRowHover(table);
        
        // Préparer le tableau pour les extensions
        prepareTableExtensions(table);
    });
}

/**
 * Ajoute des fonctionnalités responsive aux tableaux
 * @param {HTMLElement} table - Tableau à améliorer
 */
function addResponsiveFeatures(table) {
    // Si le tableau n'est pas déjà dans un conteneur responsive
    if (!table.parentElement.classList.contains('table-responsive')) {
        // Créer un wrapper responsive uniquement si nécessaire
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    }
    
    // Marquer les tableaux larges pour des comportements spécifiques sur mobile
    if (table.querySelectorAll('th').length > 5) {
        table.classList.add('wide-table');
    }
}

/**
 * Ajoute des fonctionnalités d'accessibilité
 * @param {HTMLElement} table - Tableau à améliorer
 */
function addAccessibilityFeatures(table) {
    // Vérifier et ajouter des attributs ARIA si nécessaire
    if (!table.getAttribute('role')) {
        table.setAttribute('role', 'table');
    }
    
    // Ajouter une description si le tableau a un caption
    const caption = table.querySelector('caption');
    if (caption && !table.getAttribute('aria-describedby')) {
        const id = caption.id || `table-caption-${Date.now()}`;
        caption.id = id;
        table.setAttribute('aria-describedby', id);
    }
    
    // Ajouter des rôles aux en-têtes et lignes
    table.querySelectorAll('thead tr').forEach(row => {
        row.setAttribute('role', 'row');
        row.querySelectorAll('th').forEach(cell => {
            cell.setAttribute('role', 'columnheader');
            
            // S'assurer que les cellules d'en-tête ont un ID pour référence
            if (!cell.id && cell.textContent.trim()) {
                cell.id = `col-${slugify(cell.textContent.trim())}-${Date.now()}`;
            }
        });
    });
    
    // Configurer les cellules de corps
    table.querySelectorAll('tbody tr').forEach(row => {
        row.setAttribute('role', 'row');
        row.querySelectorAll('td').forEach((cell, index) => {
            cell.setAttribute('role', 'cell');
            
            // Ajouter une référence à l'en-tête de colonne si possible
            const headerRow = table.querySelector('thead tr');
            if (headerRow) {
                const headerCell = headerRow.cells[index];
                if (headerCell && headerCell.id) {
                    cell.setAttribute('headers', headerCell.id);
                }
            }
        });
    });
}

/**
 * Configure le comportement de survol des lignes
 * @param {HTMLElement} table - Tableau à améliorer
 */
function setupRowHover(table) {
    // Ajouter des effets de survol uniquement si la classe bootstrap n'est pas déjà là
    if (!table.classList.contains('table-hover')) {
        table.querySelectorAll('tbody tr').forEach(row => {
            row.addEventListener('mouseenter', function() {
                this.classList.add('hover');
            });
            
            row.addEventListener('mouseleave', function() {
                this.classList.remove('hover');
            });
        });
    }
}

/**
 * Prépare le tableau pour d'éventuelles extensions
 * @param {HTMLElement} table - Tableau à préparer
 */
function prepareTableExtensions(table) {
    // Stocker la référence aux fonctionnalités de l'API du tableau
    table.api = {
        refresh: () => refreshTable(table),
        getHeaders: () => getTableHeaders(table),
        getRows: () => getTableRows(table)
    };
    
    // Exposer l'API via le dataset pour d'autres scripts
    table.dataset.hasApi = 'true';
}

/**
 * Rafraîchit un tableau après des modifications
 * @param {HTMLElement} table - Tableau à rafraîchir
 */
function refreshTable(table) {
    // Réinitialiser les attributs d'accessibilité
    addAccessibilityFeatures(table);
    
    // Actualiser les écouteurs d'événements pour les nouvelles lignes
    setupRowHover(table);
    
    // Notifier que le tableau a été rafraîchi
    table.dispatchEvent(new CustomEvent('table:refreshed', { bubbles: true }));
}

/**
 * Récupère les en-têtes d'un tableau
 * @param {HTMLElement} table - Tableau
 * @returns {Array} - Tableau d'en-têtes
 */
function getTableHeaders(table) {
    return Array.from(table.querySelectorAll('thead th'));
}

/**
 * Récupère les lignes d'un tableau
 * @param {HTMLElement} table - Tableau
 * @returns {Array} - Tableau de lignes
 */
function getTableRows(table) {
    return Array.from(table.querySelectorAll('tbody tr'));
}

/**
 * Convertit une chaîne en slug pour les IDs
 * @param {string} text - Texte à convertir
 * @returns {string} - Version slug du texte
 */
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Remplacer les espaces par -
        .replace(/[^\w\-]+/g, '')       // Supprimer les caractères spéciaux
        .replace(/\-\-+/g, '-')         // Remplacer plusieurs - par un seul
        .replace(/^-+/, '')             // Supprimer les - du début
        .replace(/-+$/, '');            // Supprimer les - de la fin
}

// Export par défaut pour les imports ES modules
export default { init: initTableCore };