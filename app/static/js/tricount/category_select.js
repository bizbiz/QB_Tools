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
                // Extraire les flags du dataset
                let flags = [];
                if (option.dataset.flags) {
                    try {
                        flags = JSON.parse(option.dataset.flags);
                    } catch (e) {
                        console.error("Erreur lors du parsing des flags:", e);
                    }
                }
                
                return {
                    value: option.value,
                    text: option.text,
                    flags: flags,
                    iconifyId: option.dataset.iconifyId || '',
                    iconClass: option.dataset.iconClass || '',
                    iconEmoji: option.dataset.iconEmoji || '',
                    color: option.dataset.color || '',
                    selected: option.selected
                };
            });
            
            // Sauvegarder la valeur initiale
            categorySelect.initialValue = categorySelect.value;
            
            // Chercher le sélecteur de flag associé
            const flagSelectId = categorySelect.dataset.flagSelect;
            let flagSelect = null;
            
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
                flagSelect.addEventListener('change', function() {
                    filterCategoriesByFlag(categorySelect, flagSelect);
                });
                
                // Stocker une référence à flagSelect
                categorySelect.flagSelect = flagSelect;
                
                // Filtrer initialement
                filterCategoriesByFlag(categorySelect, flagSelect);
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
        if (!categorySelect || !categorySelect.originalOptions) {
            return;
        }
        
        if (!flagSelect) {
            return;
        }
        
        // Récupérer l'ID du flag sélectionné comme nombre 
        let flagId = null;
        if (flagSelect.value && flagSelect.value !== '-1') {
            flagId = parseInt(flagSelect.value);
            if (isNaN(flagId)) {
                flagId = null;
            }
        }
        
        // Sauvegarder la valeur actuelle
        const currentValue = categorySelect.value;
        
        // ÉTAPE 1: Créer un tableau des options filtrées
        let filteredOptions = [];
        
        // Toujours ajouter l'option vide (placeholder)
        const emptyOption = categorySelect.originalOptions.find(opt => opt.value === '');
        if (emptyOption) {
            filteredOptions.push(emptyOption);
        }
        
        // ÉTAPE 2: Filtrer les options non-vides
        categorySelect.originalOptions.forEach(option => {
            // Ignorer l'option vide (déjà ajoutée)
            if (option.value === '') return;
            
            // Récupérer les flags associés à cette catégorie
            let flagIds = [];
            
            // D'abord essayer depuis option.flags
            if (option.flags && Array.isArray(option.flags)) {
                flagIds = option.flags.map(id => typeof id === 'string' ? parseInt(id) : id);
            } 
            // Ensuite essayer depuis window.categoryData
            else if (window.categoryData && window.categoryData[option.value] && 
                     window.categoryData[option.value].flagIds) {
                flagIds = window.categoryData[option.value].flagIds.map(id => 
                    typeof id === 'string' ? parseInt(id) : id
                );
            }
            
            // Décider si l'option doit être incluse
            let shouldInclude = false;
            
            // Si flagId est null, undefined, NaN ou -1, alors aucun flag n'est sélectionné
            if (flagId === null || flagId === undefined || isNaN(flagId) || flagId === -1) {
                shouldInclude = true;
            } 
            // Vérifier si le flagId est dans les flagIds de cette catégorie
            else if (flagIds.includes(flagId)) {
                shouldInclude = true;
            }
            
            if (shouldInclude) {
                filteredOptions.push(option);
            }
        });
        
        // ÉTAPE 3: Trier les options par ordre alphabétique (sauf l'option vide qui reste en premier)
        filteredOptions.sort((a, b) => {
            if (a.value === '') return -1;
            if (b.value === '') return 1;
            return a.text.localeCompare(b.text);
        });
        
        // ÉTAPE 4: Reconstruire le select avec les options filtrées
        // Vider le select
        categorySelect.innerHTML = '';
        
        // Ajouter les options filtrées
        filteredOptions.forEach(option => {
            const newOption = document.createElement('option');
            newOption.value = option.value;
            newOption.text = option.text;
            
            // Ajouter les attributs de données
            if (option.flags && option.flags.length > 0) {
                newOption.dataset.flags = JSON.stringify(option.flags);
            }
            
            // Copier tous les attributs de données pertinents
            if (option.iconifyId) newOption.dataset.iconifyId = option.iconifyId;
            if (option.iconClass) newOption.dataset.iconClass = option.iconClass;
            if (option.iconEmoji) newOption.dataset.iconEmoji = option.iconEmoji;
            if (option.color) newOption.dataset.color = option.color;
            
            // Sélectionner cette option si elle était sélectionnée avant
            // ET qu'elle est compatible avec le nouveau flag
            if (option.value === currentValue) {
                newOption.selected = true;
            }
            
            categorySelect.appendChild(newOption);
        });
        
        // ÉTAPE 5: Vérifier si la valeur actuelle est toujours dans les options disponibles
        const isCurrentValueAvailable = Array.from(categorySelect.options).some(
            option => option.value === currentValue
        );
        
        if (!isCurrentValueAvailable && currentValue !== '') {
            // Réinitialiser à "Choisir une catégorie"
            categorySelect.selectedIndex = 0;
        }
        
        // Signaler à Select2 que les options ont changé, s'il existe
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2) {
            try {
                $(categorySelect).trigger('change');
            } catch (e) {
                console.error("Erreur lors du déclenchement de l'événement change pour Select2:", e);
            }
        }
    }

    // Exposer les fonctions pour une utilisation externe
    window.CategorySelect = {
        init: initCategorySelects,
        filter: filterCategoriesByFlag
    };
})();