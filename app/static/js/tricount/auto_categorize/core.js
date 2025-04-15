// app/static/js/tricount/auto_categorize/core.js

/**
 * Module principal de la fonctionnalité auto-catégorisation
 * Point d'entrée qui initialise tous les autres modules
 */

// Fonction d'initialisation principale
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing AutoCategorize modules...");
    
    // S'assurer que l'objet global existe avec toutes les propriétés nécessaires
    window.AutoCategorize = window.AutoCategorize || {};
    
    // Initialiser les composants dans le bon ordre
    // 1. D'abord les filtres qui sont utilisés par d'autres modules
    if (typeof AutoCategorize.initFilters === 'function') {
        console.log("Initializing filters...");
        AutoCategorize.initFilters();
    }
    
    // 2. Les associations entre les flags et les catégories
    if (typeof AutoCategorize.initFlagAndCategory === 'function') {
        console.log("Initializing flag and category relationships...");
        AutoCategorize.initFlagAndCategory();
    }
    
    // 3. Les sections d'action (Catégorie, Flag, Renommage)
    if (typeof AutoCategorize.initActionSections === 'function') {
        console.log("Initializing action sections...");
        AutoCategorize.initActionSections();
    }
    
    // 4. La prévisualisation de renommage
    if (typeof AutoCategorize.initRename === 'function') {
        console.log("Initializing rename preview...");
        AutoCategorize.initRename();
    }
    
    // 5. L'interface utilisateur et les rafraîchissements
    if (typeof AutoCategorize.UI !== 'undefined' && typeof AutoCategorize.UI.init === 'function') {
        console.log("Initializing UI components...");
        AutoCategorize.UI.init();
    }
    
    // 6. La validation du formulaire (nouveau module)
    if (typeof AutoCategorize.Validation !== 'undefined' && typeof AutoCategorize.Validation.init === 'function') {
        console.log("Initializing form validation...");
        AutoCategorize.Validation.init();
    }
    
    console.log("All AutoCategorize modules initialized.");

    // Initialiser les boutons de basculement des détails
    initToggleButtons();
    
    // Fonction pour initialiser les boutons de basculement
    function initToggleButtons() {
        const toggleButtons = document.querySelectorAll('.btn-toggle-details');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', function() {
                const targetId = this.getAttribute('data-bs-target');
                const isExpanded = this.getAttribute('aria-expanded') === 'true';
                
                // Mise à jour dynamique du texte et de l'icône
                if (isExpanded) {
                    this.innerHTML = '<i class="fas fa-ellipsis-h"></i> Voir description';
                } else {
                    this.innerHTML = '<i class="fas fa-chevron-up"></i> Masquer description';
                }
            });
        });
    }
});