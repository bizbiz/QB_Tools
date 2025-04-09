// app/static/js/tricount/category_select.js

/**
 * Module pour gérer la sélection et le filtrage des catégories en fonction des flags
 */
(function() {
    // Initialiser au chargement du document
    document.addEventListener('DOMContentLoaded', function() {
        initCategorySelects();
    });

    /**
     * Initialise tous les sélecteurs de catégories
     */
    function initCategorySelects() {
        // Trouver tous les sélecteurs de catégories avec l'attribut data-category-select
        const categorySelects = document.querySelectorAll('select[data-category-select="true"]');
        
        categorySelects.forEach(categorySelect => {
            // Sauvegarder les options originales
            categorySelect.originalOptions = Array.from(categorySelect.options).map(option => {
                return {
                    value: option.value,
                    text: option.text,
                    flags: option.dataset.flags ? JSON.parse(option.dataset.flags) : [],
                    icon: option.dataset.icon || '',
                    selected: option.selected
                };
            });
            
            // Sauvegarder la valeur initiale
            categorySelect.initialValue = categorySelect.value;
            
            // Chercher le sélecteur de flag associé (peut être spécifié ou recherché automatiquement)
            const flagSelectId = categorySelect.dataset.flagSelect;
            let flagSelect;
            
            if (flagSelectId) {
                flagSelect = document.getElementById(flagSelectId);
            } else {
                // Chercher dans le même formulaire ou conteneur
                const form = categorySelect.closest('form') || categorySelect.closest('.card-body');
                if (form) {
                    flagSelect = form.querySelector('select[data-flag-select="true"]');
                }
            }
            
            // Si un sélecteur de flag est trouvé, ajouter un écouteur d'événement
            if (flagSelect) {
                console.log(`Sélecteur de flag trouvé pour ${categorySelect.id}: ${flagSelect.id}`);
                
                flagSelect.addEventListener('change', function() {
                    filterCategoriesByFlag(categorySelect, flagSelect);
                });
                
                // Stocker une référence à flagSelect
                categorySelect.flagSelect = flagSelect;
                
                // Filtrer initialement
                filterCategoriesByFlag(categorySelect, flagSelect);
            } else {
                console.warn(`Aucun sélecteur de flag trouvé pour ${categorySelect.id}`);
            }
        });
    }

    /**
     * Filtre les catégories en fonction du flag sélectionné
     * @param {HTMLSelectElement} categorySelect - Sélecteur de catégories
     * @param {HTMLSelectElement} flagSelect - Sélecteur de flags
     */
    function filterCategoriesByFlag(categorySelect, flagSelect) {
        // Vérifier que les sélecteurs et les options originales existent
        if (!categorySelect || !categorySelect.originalOptions || !flagSelect) return;
        
        // Récupérer l'ID du flag sélectionné
        const flagId = parseInt(flagSelect.value);
        console.log(`Filtrage des catégories pour flag_id=${flagId}`);
        
        // Sauvegarder la valeur actuelle
        const currentValue = categorySelect.value;
        
        // Vider les options actuelles
        categorySelect.innerHTML = '';
        
        // Ajouter l'option "Choisir une catégorie"
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = categorySelect.dataset.placeholder || 'Choisir une catégorie';
        categorySelect.appendChild(defaultOption);
        
        // Filtrer et ajouter les catégories compatibles
        categorySelect.originalOptions.forEach(option => {
            // Ne pas traiter l'option vide
            if (option.value === '') return;
            
            let shouldInclude = false;
            
            // Cas 1: C'est la valeur actuelle sélectionnée (à conserver)
            if (option.value === currentValue && currentValue !== '') {
                shouldInclude = true;
            }
            // Cas 2: Si un flag est sélectionné, vérifier si la catégorie est compatible
            else if (flagId && option.flags) {
                // Vérifier si le flagId est inclus dans les flags de la catégorie
                shouldInclude = option.flags.includes(flagId);
                
                // Log de débogage
                console.debug(`Catégorie ${option.value} (${option.text}): flags=${JSON.stringify(option.flags)}, flagId=${flagId}, includes=${shouldInclude}`);
            }
            // Cas 3: Si aucun flag n'est sélectionné, inclure toutes les catégories
            else if (!flagId) {
                shouldInclude = true;
            }
            
            if (shouldInclude) {
                const newOption = document.createElement('option');
                newOption.value = option.value;
                newOption.text = option.text;
                
                // Ajouter les data attributes
                if (option.flags) {
                    newOption.dataset.flags = JSON.stringify(option.flags);
                }
                
                if (option.icon) {
                    newOption.dataset.icon = option.icon;
                }
                
                // Sélectionner si c'était l'option sélectionnée
                if (option.value === currentValue) {
                    newOption.selected = true;
                }
                
                categorySelect.appendChild(newOption);
            }
        });
        
        // Si aucune option n'a été sélectionnée, essayer de sélectionner la première non vide
        if (categorySelect.value === '' && categorySelect.options.length > 1) {
            categorySelect.selectedIndex = 1;
        }
        
        // Déclencher un événement change pour informer d'autres listeners
        categorySelect.dispatchEvent(new Event('change'));
    }

    // Exposer les fonctions pour une utilisation externe
    window.CategorySelect = {
        init: initCategorySelects,
        filter: filterCategoriesByFlag
    };
})();