// app/static/js/tricount/auto_categorize/rename.js
// Mise à jour pour supporter à la fois le renommage du marchand et la modification de la description

/**
 * Module de gestion des renommages pour l'auto-catégorisation
 * Gère la prévisualisation du renommage du marchand et de la description
 */

// Assurer que l'objet global existe
window.AutoCategorize = window.AutoCategorize || {};

/**
 * Initialise la gestion des renommages
 */
AutoCategorize.initRename = function() {
    // Initialiser le renommage du marchand
    initMerchantRename();
    
    // Initialiser la modification de la description
    initDescriptionRename();
    
    /**
     * Initialise la gestion du renommage du marchand
     */
    function initMerchantRename() {
        // Éléments du DOM pour le marchand
        const renamePattern = document.getElementById('rename-merchant-pattern');
        const renameReplacement = document.getElementById('rename-merchant-replacement');
        const renamePreview = document.getElementById('rename-merchant-preview');
        
        // Mettre à jour l'aperçu de renommage en temps réel
        if (renamePattern && renameReplacement && renamePreview) {
            renamePattern.addEventListener('input', updateMerchantPreview);
            renameReplacement.addEventListener('input', updateMerchantPreview);
            
            // Initialiser l'aperçu
            updateMerchantPreview();
        }
    }
    
    /**
     * Initialise la gestion de la modification de description
     */
    function initDescriptionRename() {
        // Éléments du DOM pour la description
        const renamePattern = document.getElementById('rename-description-pattern');
        const renameReplacement = document.getElementById('rename-description-replacement');
        const renamePreview = document.getElementById('rename-description-preview');
        
        // Mettre à jour l'aperçu de renommage en temps réel
        if (renamePattern && renameReplacement && renamePreview) {
            renamePattern.addEventListener('input', updateDescriptionPreview);
            renameReplacement.addEventListener('input', updateDescriptionPreview);
            
            // Initialiser l'aperçu
            updateDescriptionPreview();
        }
    }
    
    /**
     * Met à jour l'aperçu du renommage du marchand en fonction des valeurs des champs
     */
    function updateMerchantPreview() {
        updatePreview(
            'rename-merchant-pattern',
            'rename-merchant-replacement',
            'rename-merchant-preview',
            window.sourceExpenseData ? window.sourceExpenseData.merchant : 'Exemple de marchand'
        );
    }
    
    /**
     * Met à jour l'aperçu de la modification de description en fonction des valeurs des champs
     */
    function updateDescriptionPreview() {
        updatePreview(
            'rename-description-pattern',
            'rename-description-replacement',
            'rename-description-preview',
            window.sourceExpenseData ? window.sourceExpenseData.description : 'Exemple de description'
        );
    }
    
    /**
     * Fonction générique pour mettre à jour un aperçu de renommage
     * @param {string} patternId - ID du champ de motif
     * @param {string} replacementId - ID du champ de remplacement
     * @param {string} previewId - ID de l'élément d'aperçu
     * @param {string} originalText - Texte original à utiliser comme base
     */
    function updatePreview(patternId, replacementId, previewId, originalText) {
        const patternElement = document.getElementById(patternId);
        const replacementElement = document.getElementById(replacementId);
        const previewElement = document.getElementById(previewId);
        
        if (!patternElement || !replacementElement || !previewElement) return;
        
        const pattern = patternElement.value;
        const replacement = replacementElement.value;
        
        try {
            if (pattern) {
                const regex = new RegExp(pattern, 'g');
                previewElement.textContent = originalText.replace(regex, replacement);
            } else {
                previewElement.textContent = originalText;
            }
        } catch (e) {
            // En cas d'erreur dans l'expression régulière
            previewElement.textContent = `Erreur: ${e.message}`;
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