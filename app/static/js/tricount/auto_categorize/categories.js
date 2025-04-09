// app/static/js/tricount/auto_categorize/categories.js

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
    const categorySelect = document.getElementById('category-id');
    
    // Stocker les options de catégorie originales pour le filtrage
    if (categorySelect) {
        categorySelect.originalOptions = Array.from(categorySelect.options).map(option => {
            return {
                value: option.value,
                text: option.text,
                selected: option.selected,
                originallySelected: option.selected // Conserver l'état initial de sélection
            };
        });
        
        // Stocker la valeur initiale sélectionnée
        categorySelect.initialValue = categorySelect.value;
    }
    
    // Mettre à jour la prévisualisation initiale du flag
    updateFlagPreview();
    
    if (flagSelect) {
        flagSelect.addEventListener('change', function() {
            updateFlagPreview();
            filterCategoriesByFlag();
            
            // Signaler un changement dans le formulaire
            if (typeof AutoCategorize.markFormChanged === 'function') {
                AutoCategorize.markFormChanged();
            }
        });
    }
    
    // Ajouter un écouteur pour le changement de catégorie
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            // Signaler un changement dans le formulaire
            if (typeof AutoCategorize.markFormChanged === 'function') {
                AutoCategorize.markFormChanged();
            }
        });
    }
    
    // Filtrer les catégories par flag au chargement
    filterCategoriesByFlag();
    
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
    
    /**
     * Filtre les catégories disponibles en fonction du flag sélectionné
     */
    function filterCategoriesByFlag() {
        if (!categorySelect || !categorySelect.originalOptions || !flagSelect) return;
        
        const flagId = parseInt(flagSelect.value);
        const currentValue = categorySelect.value;
        
        // Vider les options actuelles
        categorySelect.innerHTML = '';
        
        // Ajouter l'option "Choisir une catégorie"
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = 'Choisir une catégorie';
        categorySelect.appendChild(defaultOption);
        
        // Déterminer s'il y a une valeur initiale à préserver
        const valueToPreserve = categorySelect.initialValue;
        
        // Variable pour vérifier si on a conservé la valeur
        let preservedValueExists = false;
        
        // Filtrer et ajouter les catégories compatibles
        categorySelect.originalOptions.forEach(option => {
            // Toujours inclure l'option vide
            if (option.value === '') return;
            
            const categoryId = option.value;
            let shouldInclude = false;
            
            // Cas 1: C'est la valeur initiale sélectionnée (à conserver)
            if (categoryId === valueToPreserve) {
                shouldInclude = true;
                preservedValueExists = true;
            }
            // Cas 2: C'est l'option actuellement sélectionnée (à conserver)
            else if (categoryId === currentValue && currentValue !== '') {
                shouldInclude = true;
            }
            // Cas 3: Si un flag est sélectionné, vérifier si la catégorie est compatible
            else if (flagId && window.categoryData && window.categoryData[categoryId]) {
                const category = window.categoryData[categoryId];
                if (category.flagIds && category.flagIds.includes(flagId)) {
                    shouldInclude = true;
                }
            }
            // Cas 4: Si aucun flag n'est sélectionné, inclure toutes les catégories
            else if (!flagId) {
                shouldInclude = true;
            }
            
            if (shouldInclude) {
                const newOption = document.createElement('option');
                newOption.value = option.value;
                newOption.text = option.text;
                
                // Si c'est la valeur initiale ou celle sélectionnée, marquer comme "préservée"
                if (option.value === valueToPreserve || option.value === currentValue) {
                    newOption.className = 'preserved-category';
                    if (option.value === valueToPreserve) {
                        newOption.selected = true;
                    }
                }
                
                categorySelect.appendChild(newOption);
            }
        });
        
        // Si aucune option correspondant à la valeur initiale n'a été ajoutée mais qu'elle existe
        if (!preservedValueExists && valueToPreserve && valueToPreserve !== '') {
            // Chercher les infos de la catégorie
            const categoryName = window.categoryData && window.categoryData[valueToPreserve] ? 
                window.categoryData[valueToPreserve].name : "Catégorie initiale";
            
            // Créer l'option
            const preservedOption = document.createElement('option');
            preservedOption.value = valueToPreserve;
            preservedOption.text = categoryName + " (conservé)";
            preservedOption.className = 'preserved-category';
            preservedOption.selected = true;
            
            // Ajouter l'option
            categorySelect.appendChild(preservedOption);
        }
        
        // Si aucune valeur n'est sélectionnée mais qu'il y avait une valeur initiale, la sélectionner
        if ((categorySelect.value === '' || !categorySelect.value) && valueToPreserve) {
            categorySelect.value = valueToPreserve;
        }
    }
};

// Le module s'initialise au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    if (typeof AutoCategorize.initFlagAndCategory === 'function') {
        AutoCategorize.initFlagAndCategory();
    }
});