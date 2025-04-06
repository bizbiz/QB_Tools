// app/static/js/tricount/auto_categorize/rename.js

/**
 * Module de gestion du renommage pour l'auto-catégorisation
 * Gère la prévisualisation et les options de renommage
 */

// Assurer que l'objet global existe
window.AutoCategorize = window.AutoCategorize || {};

/**
 * Initialise la gestion du renommage
 */
AutoCategorize.initRename = function() {
    // Éléments du DOM
    const applyRenameCheckbox = document.getElementById('apply-rename');
    const renameSection = document.getElementById('rename-section');
    const renamePattern = document.getElementById('rename-pattern');
    const renameReplacement = document.getElementById('rename-replacement');
    const renamePreview = document.getElementById('rename-preview');
    
    // Afficher/masquer la section en fonction de la case à cocher
    if (applyRenameCheckbox) {
        applyRenameCheckbox.addEventListener('change', function() {
            if (renameSection) {
                renameSection.style.display = this.checked ? 'block' : 'none';
            }
            // Marquer le formulaire comme modifié
            AutoCategorize.markFormChanged();
        });
    }
    
    // Mettre à jour l'aperçu de renommage en temps réel
    if (renamePattern && renameReplacement && renamePreview) {
        const updatePreview = function() {
            const originalName = document.querySelector('.card-title').textContent || '';
            const pattern = renamePattern.value;
            const replacement = renameReplacement.value;
            
            try {
                if (pattern) {
                    const regex = new RegExp(pattern, 'g');
                    renamePreview.textContent = originalName.replace(regex, replacement);
                } else {
                    renamePreview.textContent = originalName;
                }
            } catch (e) {
                // En cas d'erreur dans l'expression régulière
                renamePreview.textContent = `Erreur: ${e.message}`;
            }
        };
        
        renamePattern.addEventListener('input', updatePreview);
        renameReplacement.addEventListener('input', updatePreview);
        
        // Initialiser l'aperçu
        updatePreview();
    }
};

// Initialiser lors du chargement
document.addEventListener('DOMContentLoaded', AutoCategorize.initRename);