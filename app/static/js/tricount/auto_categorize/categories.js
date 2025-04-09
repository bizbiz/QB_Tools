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
    function filterCategoriesByFlag(categorySelect, flagSelect) {
        // Vérifier que les sélecteurs et les options originales existent
        if (!categorySelect || !categorySelect.originalOptions) {
            console.error("categorySelect ou ses options originales sont manquants");
            return;
        }
        
        if (!flagSelect) {
            console.error("flagSelect est manquant");
            return;
        }
        
        // Récupérer l'ID du flag sélectionné
        const flagId = parseInt(flagSelect.value);
        console.log(`Filtrage des catégories pour flag_id=${flagId} (type: ${typeof flagId})`);
        
        // Debug: Afficher les données de catégories
        console.log("CategoryData:", window.categoryData);
        
        // Sauvegarder la valeur actuelle
        const currentValue = categorySelect.value;
        console.log(`Valeur actuelle du select de catégories: ${currentValue}`);
        
        // Vider les options actuelles
        categorySelect.innerHTML = '';
        
        // Ajouter l'option "Choisir une catégorie"
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = categorySelect.dataset.placeholder || 'Choisir une catégorie';
        categorySelect.appendChild(defaultOption);
        
        // Compte le nombre d'options ajoutées
        let addedOptions = 0;
        
        // Filtrer et ajouter les catégories compatibles
        categorySelect.originalOptions.forEach(option => {
            // Ne pas traiter l'option vide
            if (option.value === '') return;
            
            const categoryId = option.value;
            console.log(`Traitement de la catégorie ${categoryId} (${option.text})`);
            
            let shouldInclude = false;
            
            // Cas 1: Si aucun flag n'est sélectionné, inclure toutes les catégories
            if (!flagId || isNaN(flagId)) {
                shouldInclude = true;
                console.log(`  Aucun flag sélectionné, toutes les catégories incluses`);
            }
            // Cas 2: Si un flag est sélectionné, vérifier si la catégorie est compatible
            else if (window.categoryData && window.categoryData[categoryId]) {
                const categoryInfo = window.categoryData[categoryId];
                console.log(`  Données de la catégorie:`, categoryInfo);
                
                if (categoryInfo.flagIds && Array.isArray(categoryInfo.flagIds)) {
                    // Convertir tous les IDs en nombres pour la comparaison
                    const flagIdsAsNumbers = categoryInfo.flagIds.map(id => 
                        typeof id === 'string' ? parseInt(id) : id
                    );
                    
                    shouldInclude = flagIdsAsNumbers.includes(flagId);
                    console.log(`  flagIds=${JSON.stringify(flagIdsAsNumbers)}, flagId=${flagId}, includes=${shouldInclude}`);
                } else {
                    console.log(`  Pas de flagIds valides pour cette catégorie`);
                }
            } else {
                console.log(`  Catégorie ${categoryId} non trouvée dans categoryData`);
            }
            
            // Cas 3: Toujours inclure la valeur actuellement sélectionnée
            if (option.value === currentValue && currentValue !== '') {
                shouldInclude = true;
                console.log(`  C'est la valeur actuellement sélectionnée, inclure quand même`);
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
                    console.log(`  Option marquée comme sélectionnée`);
                }
                
                categorySelect.appendChild(newOption);
                addedOptions++;
            } else {
                console.log(`  Option exclue du filtrage`);
            }
        });
        
        console.log(`Total d'options ajoutées: ${addedOptions}`);
        
        // Si aucune option n'a été sélectionnée, essayer de sélectionner la première non vide
        if (categorySelect.value === '' && categorySelect.options.length > 1) {
            categorySelect.selectedIndex = 1;
            console.log(`Aucune option sélectionnée, sélection automatique de la première option: ${categorySelect.value}`);
        }
        
        // Déclencher un événement change pour informer d'autres listeners
        categorySelect.dispatchEvent(new Event('change'));
    }
};

// Le module s'initialise au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    if (typeof AutoCategorize.initFlagAndCategory === 'function') {
        AutoCategorize.initFlagAndCategory();
    }
});