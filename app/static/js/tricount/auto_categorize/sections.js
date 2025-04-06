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
            // Modifier la classe directement plutôt que de faire un toggle
            if (applyCategoryCheckbox.checked) {
                categorySection.classList.remove('disabled-section');
            } else {
                categorySection.classList.add('disabled-section');
            }
            
            // Désactiver/activer les champs dans la section
            categorySection.querySelectorAll('input:not([type="checkbox"]), select').forEach(input => {
                input.disabled = !applyCategoryCheckbox.checked;
            });
        }
        
        if (flagSection && applyFlagCheckbox) {
            // Modifier la classe directement
            if (applyFlagCheckbox.checked) {
                flagSection.classList.remove('disabled-section');
            } else {
                flagSection.classList.add('disabled-section');
            }
            
            // Désactiver/activer les champs dans la section
            flagSection.querySelectorAll('input:not([type="checkbox"]), select').forEach(input => {
                input.disabled = !applyFlagCheckbox.checked;
            });
        }
        
        if (renameSection && applyRenameCheckbox) {
            // Modifier la classe directement
            if (applyRenameCheckbox.checked) {
                renameSection.classList.remove('disabled-section');
                renameSection.style.display = 'block';
            } else {
                renameSection.classList.add('disabled-section');
                renameSection.style.display = 'none';
            }
            
            // Désactiver/activer les champs dans la section
            renameSection.querySelectorAll('input:not([type="checkbox"]), select').forEach(input => {
                input.disabled = !applyRenameCheckbox.checked;
            });
        }
        
        // Signaler un changement dans le formulaire
        if (typeof AutoCategorize.markFormChanged === 'function') {
            AutoCategorize.markFormChanged();
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