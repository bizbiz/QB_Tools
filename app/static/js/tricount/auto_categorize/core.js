// app/static/js/tricount/auto_categorize/core.js - Modifications

// Fonction d'initialisation principale
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les composants
    AutoCategorize.initFilters();
    AutoCategorize.initFlagAndCategory();
    AutoCategorize.initFrequency();
    AutoCategorize.initFormChangeDetection();
    AutoCategorize.initConflictDetection();
    AutoCategorize.initRename();
    AutoCategorize.initActionSections();
    AutoCategorize.initConflicts();
    
    // Bouton de rafraîchissement
    const refreshButton = document.getElementById('refresh-similar-expenses');
    if (refreshButton) {
        refreshButton.addEventListener('click', AutoCategorize.UI.refreshSimilarExpenses);
    }
});

/**
 * Initialise la gestion des sections d'action (catégorie, flag, renommage)
 */
AutoCategorize.initActionSections = function() {
    // Éléments du DOM
    const applyCategoryCheckbox = document.getElementById('apply-category');
    const applyFlagCheckbox = document.getElementById('apply-flag');
    const applyRenameCheckbox = document.getElementById('apply-rename');
    
    const categorySection = document.getElementById('category-section');
    const flagSection = document.getElementById('flag-section');
    const renameSection = document.getElementById('rename-section');
    
    // Fonction pour mettre à jour la visibilité des sections
    const updateSectionVisibility = function() {
        if (categorySection && applyCategoryCheckbox) {
            categorySection.classList.toggle('disabled-section', !applyCategoryCheckbox.checked);
            
            // Désactiver les champs dans la section
            const inputs = categorySection.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.disabled = !applyCategoryCheckbox.checked;
            });
        }
        
        if (flagSection && applyFlagCheckbox) {
            flagSection.classList.toggle('disabled-section', !applyFlagCheckbox.checked);
            
            // Désactiver les champs dans la section
            const inputs = flagSection.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.disabled = !applyFlagCheckbox.checked;
            });
        }
        
        if (renameSection && applyRenameCheckbox) {
            renameSection.style.display = applyRenameCheckbox.checked ? 'block' : 'none';
            
            // Désactiver les champs dans la section
            const inputs = renameSection.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.disabled = !applyRenameCheckbox.checked;
            });
        }
    };
    
    // Ajouter les écouteurs d'événements
    if (applyCategoryCheckbox) {
        applyCategoryCheckbox.addEventListener('change', updateSectionVisibility);
    }
    
    if (applyFlagCheckbox) {
        applyFlagCheckbox.addEventListener('change', updateSectionVisibility);
    }
    
    if (applyRenameCheckbox) {
        applyRenameCheckbox.addEventListener('change', updateSectionVisibility);
    }
    
    // Initialiser l'état des sections
    updateSectionVisibility();
};