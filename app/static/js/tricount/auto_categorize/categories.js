// app/static/js/tricount/auto_categorize/categories.js - Simplifier la fonction pour éviter les conflits

/**
 * Module de gestion des catégories et flags pour l'auto-catégorisation
 * Gère la synchronisation entre sélection de flag et catégories disponibles
 */

// Assurer que l'objet global existe
window.AutoCategorize = window.AutoCategorize || {};

/**
 * Initialise la gestion des flags et catégories
 */
AutoCategorize.initFlagAndCategory = function() {
    // Sélecteurs de flag et de catégorie
    const flagSelect = document.getElementById('flag-id');
    
    // Mettre à jour la prévisualisation initiale du flag
    updateFlagPreview();
    
    if (flagSelect) {
        flagSelect.addEventListener('change', function() {
            updateFlagPreview();
            
            // Signaler un changement dans le formulaire
            if (typeof AutoCategorize.markFormChanged === 'function') {
                AutoCategorize.markFormChanged();
            }
        });
    }
    
    /**
     * Met à jour la prévisualisation du flag sélectionné
     */
    function updateFlagPreview() {
        const flagPreview = document.getElementById('flag-preview');
        
        if (!flagPreview || !flagSelect) return;
        
        const flagId = flagSelect.value;
        flagPreview.innerHTML = '';
        
        if (flagId && window.flagData && window.flagData[flagId]) {
            const flag = window.flagData[flagId];
            
            // Créer le badge de prévisualisation
            const badge = document.createElement('span');
            badge.className = 'flag-badge me-2';
            badge.style.backgroundColor = flag.color;
            badge.style.color = 'white';
            badge.style.padding = '4px 12px';
            badge.style.borderRadius = '20px';
            badge.style.display = 'inline-flex';
            badge.style.alignItems = 'center';
            
            // Ajouter l'icône
            const icon = document.createElement('i');
            icon.className = `fas ${flag.icon} me-2`;
            badge.appendChild(icon);
            
            // Ajouter le nom
            const nameSpan = document.createElement('span');
            nameSpan.textContent = flag.name;
            badge.appendChild(nameSpan);
            
            flagPreview.appendChild(badge);
        }
    }
};

// Le module s'initialise au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    if (typeof AutoCategorize.initFlagAndCategory === 'function') {
        AutoCategorize.initFlagAndCategory();
    }
});