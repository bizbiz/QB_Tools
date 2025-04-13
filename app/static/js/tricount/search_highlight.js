// app/static/js/tricount/search_highlight.js

/**
 * Module pour surligner les termes de recherche dans les résultats
 */
document.addEventListener('DOMContentLoaded', function() {
    // Récupérer le terme de recherche depuis l'URL
    const searchTerm = getSearchTermFromUrl() || '';
    
    // Surligner le terme de recherche si présent
    if (searchTerm.length > 2) { // Ignorer les termes trop courts
        highlightSearchTerm(searchTerm);
    }
    
    /**
     * Récupère le terme de recherche depuis l'URL
     * @returns {string|null} Le terme de recherche ou null s'il n'y en a pas
     */
    function getSearchTermFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('search');
    }
    
    /**
     * Surligne toutes les occurrences d'un terme dans les éléments textuels
     * @param {string} term - Le terme à surligner
     */
    function highlightSearchTerm(term) {
        if (!term || term.trim() === '') return;
        
        // Éléments dans lesquels chercher
        const merchantElements = document.querySelectorAll('.expense-card .card-title, tr td:nth-child(2) .fw-bold');
        const descriptionElements = document.querySelectorAll('.expense-card .card-text, tr td:nth-child(2) .small.text-muted');
        
        // Fonction pour surligner dans un élément
        function highlightInElement(element) {
            if (!element || !element.textContent) return;
            
            // Texte original
            const originalText = element.textContent;
            
            // Créer une regex insensible à la casse
            const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
            
            // Remplacer par une version surlignée
            const newHtml = originalText.replace(regex, '<span class="search-highlight">$1</span>');
            
            // Ne modifier le DOM que si nécessaire
            if (newHtml !== originalText) {
                element.innerHTML = newHtml;
            }
        }
        
        // Appliquer aux éléments trouvés
        merchantElements.forEach(highlightInElement);
        descriptionElements.forEach(highlightInElement);
        
        // Ajouter une classe aux lignes contenant des termes surlignés
        const highlightedRows = document.querySelectorAll('.search-highlight');
        highlightedRows.forEach(highlight => {
            const row = highlight.closest('tr');
            if (row) {
                row.classList.add('highlight-row');
            }
            
            const card = highlight.closest('.expense-card');
            if (card) {
                card.classList.add('highlight-row');
            }
        });
        
        // Ajouter un compteur de résultats
        addSearchResultsCount(merchantElements.length + descriptionElements.length);
    }
    
    /**
     * Échappe les caractères spéciaux dans une chaîne pour une utilisation dans RegExp
     * @param {string} string - La chaîne à échapper
     * @returns {string} La chaîne échappée
     */
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Ajoute un compteur de résultats de recherche
     * @param {number} count - Nombre de résultats
     */
    function addSearchResultsCount(count) {
        const filterForm = document.getElementById('filter-form');
        if (!filterForm) return;
        
        const countSpan = document.createElement('span');
        countSpan.className = 'search-results-count' + (count > 0 ? ' has-results' : '');
        countSpan.innerHTML = count > 0 
            ? `<i class="fas fa-check-circle me-1"></i>${count} résultats trouvés pour <strong>"${searchTerm}"</strong>`
            : `<i class="fas fa-info-circle me-1"></i>Aucun résultat trouvé pour <strong>"${searchTerm}"</strong>`;
        
        // Insérer après le bouton de recherche
        const searchButton = filterForm.querySelector('button[type="submit"]');
        if (searchButton) {
            const parentDiv = searchButton.closest('div');
            if (parentDiv) {
                parentDiv.parentNode.insertBefore(countSpan, parentDiv.nextSibling);
            }
        }
    }
});