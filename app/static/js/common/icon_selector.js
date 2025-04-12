// app/static/js/common/icon_selector.js

/**
 * Module pour la recherche et la sélection d'icônes Iconify avec affichage direct
 */
(function() {
    // Configuration
    const ICONIFY_API_URL = 'https://api.iconify.design/search';
    const COLLECTIONS = ['mdi', 'fa', 'fa-solid', 'material-symbols', 'fluent', 'carbon'];
    const MAX_RESULTS = 20;
    
    // Variables globales
    const searchTimeouts = {};
    let iconifyLoaded = false;
    
    // Initialiser au chargement du document
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Initializing icon selector...");
        
        // Vérifier si Iconify est présent, sinon le charger
        if (!window.Iconify) {
            loadIconifyLibrary();
        } else {
            iconifyLoaded = true;
        }
        
        // Initialiser tous les champs de recherche d'icônes
        initIconSearchFields();
        
        // Fermer les résultats quand on clique ailleurs
        document.addEventListener('click', function(event) {
            const resultsContainers = document.querySelectorAll('.icon-search-results');
            resultsContainers.forEach(container => {
                // Vérifier si le clic est en dehors du conteneur
                if (!container.contains(event.target) && 
                    !event.target.classList.contains('icon-search-input')) {
                    // Ne pas fermer si c'est vide (déjà fermé)
                    if (container.innerHTML.trim() !== '') {
                        container.innerHTML = '';
                    }
                }
            });
        });
    });
    
    /**
     * Charge la bibliothèque Iconify si elle n'est pas déjà présente
     */
    function loadIconifyLibrary() {
        console.log("Loading Iconify library...");
        const script = document.createElement('script');
        script.src = 'https://code.iconify.design/2/2.2.1/iconify.min.js';
        script.async = true;
        script.onload = function() {
            console.log("Iconify library loaded successfully");
            iconifyLoaded = true;
            
            // Scanner les icônes existantes
            window.Iconify.scan();
        };
        document.head.appendChild(script);
    }
    
    /**
     * Initialise tous les champs de recherche d'icônes
     */
    function initIconSearchFields() {
        const searchInputs = document.querySelectorAll('.icon-search-input');
        const clearButtons = document.querySelectorAll('.icon-clear-btn');
        
        console.log(`Found ${searchInputs.length} icon search fields`);
        
        // Initialiser chaque champ de recherche
        searchInputs.forEach(input => {
            // Ajouter l'écouteur d'événement pour la recherche en temps réel
            input.addEventListener('input', debounceSearch);
            
            // Ajouter l'écouteur pour la touche Echap
            input.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                    // Fermer les résultats
                    const resultsId = `${input.id}-results`;
                    const resultsElement = document.getElementById(resultsId);
                    if (resultsElement) {
                        resultsElement.innerHTML = '';
                    }
                }
            });
            
            // Initialiser l'aperçu si une valeur est déjà présente
            if (input.value) {
                updateIconPreview(input);
            }
        });
        
        // Initialiser les boutons de suppression
        clearButtons.forEach(button => {
            button.addEventListener('click', function() {
                const inputId = this.dataset.target;
                const input = document.getElementById(inputId);
                
                if (input) {
                    // Effacer la valeur
                    input.value = '';
                    
                    // Effacer l'aperçu
                    updateIconPreview(input);
                    
                    // Effacer les résultats
                    const resultsId = `${inputId}-results`;
                    const resultsElement = document.getElementById(resultsId);
                    if (resultsElement) {
                        resultsElement.innerHTML = '';
                    }
                    
                    // Focus sur l'input
                    input.focus();
                }
            });
        });
    }
    
    /**
     * Fonction pour retarder la recherche pendant la frappe
     * @param {Event} event - Événement input
     */
    function debounceSearch(event) {
        const input = event.target;
        const query = input.value.trim();
        const resultsId = `${input.id}-results`;
        
        // Effacer le timeout précédent
        if (searchTimeouts[input.id]) {
            clearTimeout(searchTimeouts[input.id]);
        }
        
        // Obtenir l'élément des résultats
        const resultsElement = document.getElementById(resultsId);
        if (!resultsElement) return;
        
        // Si la requête est vide, effacer les résultats
        if (query.length === 0) {
            resultsElement.innerHTML = '';
            return;
        }
        
        // Si la requête est trop courte, afficher un message
        if (query.length < 2) {
            resultsElement.innerHTML = `
                <div class="icon-search-message">
                    Entrez au moins 2 caractères pour rechercher
                </div>
            `;
            return;
        }
        
        // Afficher un indicateur de chargement
        resultsElement.innerHTML = `
            <div class="icon-search-loading">
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-2">Recherche en cours...</p>
            </div>
        `;
        
        // Définir un nouveau timeout
        searchTimeouts[input.id] = setTimeout(() => {
            searchIcons(query, resultsElement, input);
        }, 300);
    }
    
    /**
     * Recherche des icônes via l'API Iconify
     * @param {string} query - Terme de recherche
     * @param {HTMLElement} resultsElement - Élément où afficher les résultats
     * @param {HTMLElement} inputElement - Champ de recherche associé
     */
    function searchIcons(query, resultsElement, inputElement) {
        console.log(`Searching icons for: "${query}"`);
        
        // Vérifier si Iconify est chargé
        if (!iconifyLoaded) {
            resultsElement.innerHTML = `
                <div class="icon-search-message">
                    Chargement de la bibliothèque Iconify...
                </div>
            `;
            return;
        }
        
        // Construire l'URL de recherche
        let searchUrl = `${ICONIFY_API_URL}?query=${encodeURIComponent(query)}&limit=${MAX_RESULTS}`;
        
        // Ajouter les collections si spécifiées
        if (COLLECTIONS && COLLECTIONS.length > 0) {
            searchUrl += `&collections=${COLLECTIONS.join(',')}`;
        }
        
        // Faire la requête
        fetch(searchUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`Found ${data.icons ? data.icons.length : 0} icons for "${query}"`);
                
                // Traiter les résultats
                const icons = data.icons || [];
                
                if (icons.length === 0) {
                    // Aucun résultat
                    resultsElement.innerHTML = `
                        <div class="icon-search-message">
                            Aucune icône trouvée pour "${query}"
                        </div>
                    `;
                    return;
                }
                
                // Afficher les résultats dans une grille
                let gridHTML = '<div class="icon-grid">';
                
                icons.forEach(icon => {
                    // Vérifier si cette icône est déjà sélectionnée
                    const isSelected = inputElement.value === icon;
                    const selectedClass = isSelected ? 'selected' : '';
                    
                    gridHTML += `
                        <div class="icon-item ${selectedClass}" 
                             data-icon="${icon}" 
                             onclick="window.IconSelector.selectIcon('${icon}', '${inputElement.id}')">
                            <span class="iconify" data-icon="${icon}"></span>
                            <small class="icon-name">${icon.split(':')[1]}</small>
                        </div>
                    `;
                });
                
                gridHTML += '</div>';
                resultsElement.innerHTML = gridHTML;
                
                // Actualiser les icônes
                if (window.Iconify) {
                    window.Iconify.scan();
                }
            })
            .catch(error => {
                console.error('Error during icon search:', error);
                
                // Afficher l'erreur
                resultsElement.innerHTML = `
                    <div class="icon-search-message text-danger">
                        Erreur: ${error.message}
                    </div>
                `;
            });
    }
    
    /**
     * Sélectionne une icône et met à jour l'aperçu
     * @param {string} iconId - ID de l'icône (format: collection:name)
     * @param {string} inputId - ID du champ d'entrée
     */
    function selectIcon(iconId, inputId) {
        console.log(`Selecting icon: ${iconId} for input: ${inputId}`);
        
        const input = document.getElementById(inputId);
        if (!input) return;
        
        // Mettre à jour la valeur
        input.value = iconId;
        
        // Mettre à jour l'aperçu
        updateIconPreview(input);
        
        // Fermer les résultats
        const resultsId = `${inputId}-results`;
        const resultsElement = document.getElementById(resultsId);
        if (resultsElement) {
            resultsElement.innerHTML = '';
        }
        
        // Déclencher un événement de changement
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    /**
     * Met à jour l'aperçu de l'icône
     * @param {HTMLElement} input - Champ d'entrée
     */
    function updateIconPreview(input) {
        const previewId = `${input.id}-preview`;
        const previewElement = document.getElementById(previewId);
        
        if (!previewElement) return;
        
        // Si une icône est sélectionnée, l'afficher
        if (input.value) {
            previewElement.innerHTML = `
                <span class="iconify me-2" data-icon="${input.value}" style="font-size: 1.5rem;"></span>
                <code>${input.value}</code>
            `;
        } else {
            // Sinon, vider l'aperçu
            previewElement.innerHTML = '';
        }
        
        // Actualiser les icônes
        if (window.Iconify) {
            window.Iconify.scan();
        }
    }
    
    // Exposer les fonctions publiques
    window.IconSelector = {
        selectIcon: selectIcon,
        updatePreview: updateIconPreview,
        search: searchIcons
    };
})();