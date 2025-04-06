// app/static/js/tricount/auto_categorize/rename.js

/**
 * Module de gestion du renommage pour l'auto-catégorisation
 * Gère la prévisualisation du renommage
 */

// Assurer que l'objet global existe
window.AutoCategorize = window.AutoCategorize || {};

/**
 * Initialise la gestion du renommage
 */
AutoCategorize.initRename = function() {
    // Éléments du DOM
    const renamePattern = document.getElementById('rename-pattern');
    const renameReplacement = document.getElementById('rename-replacement');
    const renamePreview = document.getElementById('rename-preview');
    
    // Mettre à jour l'aperçu de renommage en temps réel
    if (renamePattern && renameReplacement && renamePreview) {
        renamePattern.addEventListener('input', updateRenamePreview);
        renameReplacement.addEventListener('input', updateRenamePreview);
        
        // Initialiser l'aperçu
        updateRenamePreview();
    }
    
    /**
     * Met à jour l'aperçu du renommage en fonction des valeurs des champs
     */
    function updateRenamePreview() {
        // Utiliser le nom du marchand de la dépense d'origine si disponible
        const originalName = window.sourceExpenseData ? 
            window.sourceExpenseData.merchant : 
            document.querySelector('.card-body .row p:first-of-type strong').nextSibling.textContent.trim();
        
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
        
        // Signaler un changement dans le formulaire
        if (typeof AutoCategorize.markFormChanged === 'function') {
            AutoCategorize.markFormChanged();
        }
    }
};

// Le module s'initialise au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    if (typeof AutoCategorize.initRename === 'function') {
        AutoCategorize.initRename();
    }
});