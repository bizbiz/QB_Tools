// app/static/js/tricount/auto_categorize/sections.js

/**
 * Module de gestion des sections d'action (type, catégorie, renommage)
 * Gère l'activation/désactivation des sections
 */

// S'assurer que l'objet global existe
window.AutoCategorize = window.AutoCategorize || {};

/**
 * Initialise la gestion des sections d'action
 */
AutoCategorize.initActionSections = function() {
    // Éléments du DOM - on utilise un sélecteur de classe pour trouver tous les toggles
    const sectionToggles = document.querySelectorAll('.section-toggle');
    
    // Ajouter les écouteurs d'événements à tous les toggles
    sectionToggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const sectionId = this.id.replace('apply-', '');
            const section = document.getElementById(`${sectionId}-section`);
            
            if (section) {
                updateSectionState(this, section);
            }
        });
        
        // Initialiser chaque section
        const sectionId = toggle.id.replace('apply-', '');
        const section = document.getElementById(`${sectionId}-section`);
        
        if (section) {
            updateSectionState(toggle, section);
        }
    });
    
    /**
     * Met à jour l'état d'une section en fonction de l'état de son toggle
     * @param {HTMLElement} toggle - Checkbox pour activer/désactiver
     * @param {HTMLElement} section - Section à activer/désactiver
     */
    function updateSectionState(toggle, section) {
        // Récupérer tous les champs d'entrée dans la section, sauf les checkboxes
        const inputs = section.querySelectorAll('input:not([type="checkbox"]), select, textarea');
        
        if (toggle.checked) {
            // Activer la section
            section.classList.remove('disabled-section');
            
            // Activer tous les champs d'entrée
            inputs.forEach(input => {
                input.disabled = false;
            });
            
            // Afficher la section si c'est la section de renommage
            if (section.id === 'rename-section') {
                section.style.display = 'block';
            }
        } else {
            // Désactiver la section
            section.classList.add('disabled-section');
            
            // Désactiver tous les champs d'entrée
            inputs.forEach(input => {
                input.disabled = true;
            });
            
            // Masquer la section si c'est la section de renommage
            if (section.id === 'rename-section') {
                section.style.display = 'none';
            }
        }
        
        // Signaler un changement dans le formulaire
        if (typeof AutoCategorize.markFormChanged === 'function') {
            AutoCategorize.markFormChanged();
        }
    }
};

// Le module s'initialise au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    if (typeof AutoCategorize.initActionSections === 'function') {
        AutoCategorize.initActionSections();
    }
});