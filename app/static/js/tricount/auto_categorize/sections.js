// app/static/js/tricount/auto_categorize/sections.js

// S'assurer que l'objet global existe
window.AutoCategorize = window.AutoCategorize || {};

/**
 * Initialise la gestion des sections d'action (type, catégorie, renommage)
 */
AutoCategorize.initActionSections = function() {
    // Éléments du DOM
    const applyCategoryCheckbox = document.getElementById('apply-category');
    const applyFlagCheckbox = document.getElementById('apply-flag');
    const applyRenameCheckbox = document.getElementById('apply-rename');
    
    const categorySection = document.getElementById('category-section');
    const flagSection = document.getElementById('flag-section');
    const renameSection = document.getElementById('rename-section');
    
    // Fonction pour mettre à jour la visibilité et l'état des sections
    const updateSectionState = function() {
        if (categorySection && applyCategoryCheckbox) {
            categorySection.classList.toggle('disabled-section', !applyCategoryCheckbox.checked);
            
            // Désactiver les champs dans la section
            categorySection.querySelectorAll('input, select').forEach(input => {
                input.disabled = !applyCategoryCheckbox.checked;
            });
        }
        
        if (flagSection && applyFlagCheckbox) {
            flagSection.classList.toggle('disabled-section', !applyFlagCheckbox.checked);
            
            // Désactiver les champs dans la section
            flagSection.querySelectorAll('input, select').forEach(input => {
                input.disabled = !applyFlagCheckbox.checked;
            });
        }
        
        if (renameSection && applyRenameCheckbox) {
            renameSection.classList.toggle('disabled-section', !applyRenameCheckbox.checked);
            
            // Désactiver les champs dans la section
            renameSection.querySelectorAll('input, select').forEach(input => {
                input.disabled = !applyRenameCheckbox.checked;
            });
        }
    };
    
    // Ajouter les écouteurs d'événements
    if (applyCategoryCheckbox) {
        applyCategoryCheckbox.addEventListener('change', updateSectionState);
    }
    
    if (applyFlagCheckbox) {
        applyFlagCheckbox.addEventListener('change', updateSectionState);
    }
    
    if (applyRenameCheckbox) {
        applyRenameCheckbox.addEventListener('change', updateSectionState);
    }
    
    // Initialiser l'état des sections
    updateSectionState();
};

// Initialiser lors du chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    AutoCategorize.initActionSections();
});