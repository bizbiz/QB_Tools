// app/static/js/tricount/expense_search.js

/**
 * Module pour la gestion de la recherche et des filtres dans les dépenses
 */
document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const searchInput = document.getElementById('search');
    const filterForm = document.getElementById('filter-form');
    const categorySelect = document.getElementById('category_id');
    const flagSelect = document.getElementById('flag_id');
    const startDateInput = document.getElementById('start_date');
    const endDateInput = document.getElementById('end_date');
    
    // Vérifier si les éléments existent
    if (!filterForm) return;
    
    // Configuration
    const CONFIG = {
        ENABLE_LIVE_FILTERS: true, // Active tous les filtres en temps réel
        FILTER_DELAY: 500, // Délai avant d'appliquer les filtres (en ms)
    };

    if (CONFIG.ENABLE_LIVE_FILTERS) {
        const searchButton = filterForm.querySelector('button[type="submit"]');
        if (searchButton) {
            searchButton.classList.add('d-none');
            
            // Remplacer par un badge indiquant le filtrage automatique
            const autoFilterBadge = document.createElement('div');
            autoFilterBadge.className = 'alert alert-info mb-0';
            autoFilterBadge.innerHTML = '<i class="fas fa-info-circle me-2"></i>Les filtres sont appliqués automatiquement.';
            
            // Insérer le badge à la place du bouton
            if (searchButton.parentNode) {
                searchButton.parentNode.appendChild(autoFilterBadge);
            }
        }
    }
    
    // Variable pour stocker le délai avant soumission
    let filterTimeout = null;
    
    // Ajouter un indicateur de chargement
    const loadingIndicator = createLoadingIndicator();
    document.querySelector('.container').appendChild(loadingIndicator);
    
    // Si les filtres en temps réel sont activés
    if (CONFIG.ENABLE_LIVE_FILTERS) {
        const filterInputs = [
            searchInput, 
            categorySelect, 
            flagSelect, 
            startDateInput, 
            endDateInput
        ].filter(el => el !== null); // Filtrer les éléments null
        
        // Ajouter les écouteurs sur tous les champs de filtre
        filterInputs.forEach(input => {
            const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
            input.addEventListener(eventType, debounceFilter);
        });
        
        // Écouteur spécial pour les champs de date (à la perte de focus)
        [startDateInput, endDateInput].filter(el => el !== null).forEach(dateInput => {
            dateInput.addEventListener('change', debounceFilter);
        });
    }
    
    // Amélioration UX: effacer le champ de recherche avec un bouton X
    if (searchInput) {
        addClearButton(searchInput);
    }
    
    // Centrer le focus sur le champ de recherche avec Ctrl+F
    document.addEventListener('keydown', function(e) {
        // Ctrl+F ou Cmd+F (Mac)
        if ((e.ctrlKey || e.metaKey) && e.key === 'f' && searchInput) {
            // Empêcher le comportement par défaut du navigateur
            e.preventDefault();
            
            // Donner le focus au champ de recherche
            searchInput.focus();
            
            // Optionnel: sélectionner tout le texte
            searchInput.select();
        }
    });
    
    /**
     * Retarde la soumission du formulaire (debounce)
     */
    function debounceFilter() {
        // Annuler le timeout précédent
        if (filterTimeout) {
            clearTimeout(filterTimeout);
        }
        
        // Afficher l'indicateur de chargement
        showLoading();
        
        // Définir un nouveau timeout pour retarder la recherche
        filterTimeout = setTimeout(function() {
            // Soumettre le formulaire après le délai
            submitFilterForm();
        }, CONFIG.FILTER_DELAY);
    }
    
    /**
     * Soumet le formulaire de filtrage
     */
    function submitFilterForm() {
        // Soumission du formulaire
        filterForm.submit();
    }
    
    /**
     * Crée et retourne un indicateur de chargement
     * @returns {HTMLElement} L'élément de l'indicateur de chargement
     */
    function createLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'filter-loading-indicator';
        indicator.className = 'position-fixed top-50 start-50 translate-middle bg-white p-3 rounded shadow d-none';
        indicator.style.zIndex = 1050;
        indicator.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="spinner-border text-primary me-3" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <span>Mise à jour des résultats...</span>
            </div>
        `;
        return indicator;
    }
    
    /**
     * Affiche l'indicateur de chargement
     */
    function showLoading() {
        const indicator = document.getElementById('filter-loading-indicator');
        if (indicator) {
            indicator.classList.remove('d-none');
        }
    }
});

/**
 * Ajoute un bouton pour effacer le champ de recherche
 * @param {HTMLElement} inputElement - Élément input à améliorer
 */
function addClearButton(inputElement) {
    // Vérifier si l'élément existe
    if (!inputElement) return;
    
    // Créer le bouton de suppression
    const clearButton = document.createElement('button');
    clearButton.setAttribute('type', 'button');
    clearButton.className = 'btn btn-sm btn-link position-absolute end-0 top-50 translate-middle-y text-muted d-none';
    clearButton.innerHTML = '<i class="fas fa-times"></i>';
    clearButton.style.zIndex = '5';
    clearButton.style.marginRight = '10px';
    
    // Ajouter le bouton à côté du champ de recherche
    inputElement.parentNode.style.position = 'relative';
    inputElement.parentNode.appendChild(clearButton);
    
    // Gérer l'affichage du bouton
    function toggleClearButton() {
        if (inputElement.value.length > 0) {
            clearButton.classList.remove('d-none');
        } else {
            clearButton.classList.add('d-none');
        }
    }
    
    // Écouteurs d'événements
    inputElement.addEventListener('input', toggleClearButton);
    clearButton.addEventListener('click', function() {
        inputElement.value = '';
        clearButton.classList.add('d-none');
        inputElement.focus();
        
        // Si le formulaire a un gestionnaire de soumission personnalisé, le déclencher
        const form = inputElement.closest('form');
        if (form) {
            // Cela soumettra le formulaire pour actualiser les résultats
            form.dispatchEvent(new Event('submit'));
        }
    });
    
    // Initialiser l'état du bouton
    toggleClearButton();
}