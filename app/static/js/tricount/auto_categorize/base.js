// app/static/js/tricount/auto_categorize/base.js

/**
 * Fichier de base qui initialise les structures principales de l'objet AutoCategorize
 * Ce fichier doit être chargé avant tous les autres modules
 */

// Initialiser l'objet global AutoCategorize et ses sous-objets
window.AutoCategorize = {
    // Sous-module UI pour les éléments d'interface utilisateur
    UI: {
        // Méthode d'initialisation de l'interface
        init: function() {
            console.log("UI module initialized");
            
            // Initialiser le bouton de rafraîchissement
            const refreshButton = document.getElementById('refresh-similar-expenses');
            if (refreshButton) {
                refreshButton.addEventListener('click', this.refreshSimilarExpenses);
            }
            
            // Initialiser les badges de conflit si la méthode existe
            if (typeof this.initConflictIndicators === 'function') {
                this.initConflictIndicators();
            }
        },
        
        // Méthode pour rafraîchir les dépenses similaires
        refreshSimilarExpenses: function() {
            console.log("Refreshing similar expenses");
            // Cette méthode sera implémentée dans le fichier ui.js
        },
        
        // Méthode pour initialiser les indicateurs de conflit
        initConflictIndicators: function() {
            console.log("Initializing conflict indicators");
            // Cette méthode sera implémentée dans le fichier ui.js
        }
    },
    
    // Sous-module Validation pour la validation du formulaire
    Validation: {
        // Méthode d'initialisation du module de validation
        init: function() {
            console.log("Validation module initialized");
        }
    },
    
    // Sous-module Conflicts pour la gestion des conflits entre règles
    Conflicts: {
        // Méthode pour vérifier les conflits avec d'autres règles
        checkConflicts: function() {
            console.log("Checking for rule conflicts");
            // Cette méthode sera implémentée dans le fichier conflicts.js
            return Promise.resolve(false);
        }
    },
    
    // Méthodes globales
    initFilters: function() {
        console.log("Filters initialized");
        // Cette méthode sera implémentée dans le fichier filters.js
    },
    
    initFlagAndCategory: function() {
        console.log("Flag and category relationship initialized");
        // Cette méthode sera implémentée dans le fichier categories.js
    },
    
    initActionSections: function() {
        console.log("Action sections initialized");
        // Cette méthode sera implémentée dans le fichier sections.js
    },
    
    initRename: function() {
        console.log("Rename preview initialized");
        // Cette méthode sera implémentée dans le fichier rename.js
    },
    
    // Méthode pour récupérer les filtres actuels
    getFilters: function() {
        // Cette méthode sera implémentée dans le fichier filters.js
        return {};
    }
};