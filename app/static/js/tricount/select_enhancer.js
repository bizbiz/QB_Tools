// app/static/js/tricount/select_enhancer.js

/**
 * Module pour améliorer l'apparence des select de catégories et flags
 */
(function() {
    // Initialiser au chargement du document
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Initializing select enhancer...");
        
        // Améliorer les selects de catégories
        enhanceCategorySelects();
        
        // Améliorer les selects de flags
        enhanceFlagSelects();
    });
    
    /**
     * Améliore l'apparence des selects de catégories
     */
    function enhanceCategorySelects() {
        const categorySelects = document.querySelectorAll('.category-select');
        
        categorySelects.forEach(select => {
            // Appliquer une couleur de bordure basée sur la catégorie sélectionnée
            updateCategorySelectBorder(select);
            
            // Ajouter un écouteur d'événement pour le changement de sélection
            select.addEventListener('change', function() {
                updateCategorySelectBorder(this);
            });
        });
    }
    
    /**
     * Met à jour la couleur de bordure d'un select de catégorie
     * @param {HTMLElement} select - L'élément select à mettre à jour
     */
    function updateCategorySelectBorder(select) {
        const selectedOption = select.options[select.selectedIndex];
        
        if (selectedOption && selectedOption.value) {
            const color = selectedOption.dataset.color;
            if (color) {
                select.style.borderColor = color;
                select.style.borderWidth = '2px';
            }
        } else {
            // Réinitialiser à la bordure par défaut
            select.style.borderColor = '#dee2e6';
            select.style.borderWidth = '1px';
        }
    }
    
    /**
     * Améliore l'apparence des selects de flags
     */
    function enhanceFlagSelects() {
        const flagSelects = document.querySelectorAll('.flag-select');
        
        flagSelects.forEach(select => {
            // Colorer les options de ce select
            colorFlagOptions(select);
            
            // Mettre à jour l'apparence en fonction de la sélection actuelle
            updateFlagSelectAppearance(select);
            
            // Ajouter un écouteur d'événement pour le changement de sélection
            select.addEventListener('change', function() {
                updateFlagSelectAppearance(this);
            });
        });
    }
    
    /**
     * Colore les options d'un select de flag
     * @param {HTMLElement} select - L'élément select à modifier
     */
    function colorFlagOptions(select) {
        // Cette fonction est limitée car les navigateurs restreignent le style des options
        // Elle peut fonctionner différemment selon le navigateur
        for (let i = 0; i < select.options.length; i++) {
            const option = select.options[i];
            if (option.value) {
                const color = option.dataset.color;
                if (color) {
                    // Tentative avec CSS
                    option.style.backgroundColor = color + '22'; // Ajouter transparence
                    option.style.borderLeft = '4px solid ' + color;
                    option.style.paddingLeft = '10px';
                }
            }
        }
    }
    
    /**
     * Met à jour l'apparence d'un select de flag
     * @param {HTMLElement} select - L'élément select à mettre à jour
     */
    function updateFlagSelectAppearance(select) {
        const selectedOption = select.options[select.selectedIndex];
        
        if (selectedOption && selectedOption.value) {
            const color = selectedOption.dataset.color;
            if (color) {
                // Appliquer une bordure de la couleur du flag
                select.style.borderColor = color;
                select.style.borderWidth = '2px';
                
                // Ajouter une couleur de fond légère
                select.style.backgroundColor = color + '11'; // Très transparente
            }
        } else {
            // Réinitialiser à l'apparence par défaut
            select.style.borderColor = '#dee2e6';
            select.style.borderWidth = '1px';
            select.style.backgroundColor = '';
        }
    }

})();