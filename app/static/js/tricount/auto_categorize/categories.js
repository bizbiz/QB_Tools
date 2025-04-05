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
                text: option.text
            };
        });
    }
    
    if (flagSelect) {
        flagSelect.addEventListener('change', function() {
            AutoCategorize.updateFlagPreview();
            AutoCategorize.filterCategoriesByFlag();
            AutoCategorize.markFormChanged();
        });
        
        // Initialiser au chargement
        AutoCategorize.updateFlagPreview();
        AutoCategorize.filterCategoriesByFlag();
    }
    
    // Ajouter un écouteur pour le changement de catégorie
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            AutoCategorize.markFormChanged();
        });
    }
};

/**
 * Met à jour la prévisualisation du flag sélectionné
 */
AutoCategorize.updateFlagPreview = function() {
    const flagSelect = document.getElementById('flag-id');
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
};

/**
 * Filtre les catégories disponibles en fonction du flag sélectionné
 */
AutoCategorize.filterCategoriesByFlag = function() {
    const flagSelect = document.getElementById('flag-id');
    const categorySelect = document.getElementById('category-id');
    
    if (!categorySelect || !categorySelect.originalOptions || !flagSelect) return;
    
    const flagId = parseInt(flagSelect.value);
    
    // Vider les options actuelles
    categorySelect.innerHTML = '';
    
    // Ajouter l'option "Choisir une catégorie"
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.text = 'Choisir une catégorie';
    categorySelect.appendChild(defaultOption);
    
    // Filtrer et ajouter les catégories compatibles
    const compatibleCategories = [];
    
    if (flagId) {
        // Filtrer les catégories compatibles avec ce flag
        for (const categoryId in window.categoryData) {
            const category = window.categoryData[categoryId];
            if (category.flagIds && category.flagIds.includes(flagId)) {
                compatibleCategories.push({
                    id: categoryId,
                    name: category.name
                });
            }
        }
    } else {
        // Si aucun flag n'est sélectionné, montrer toutes les catégories
        for (const categoryId in window.categoryData) {
            compatibleCategories.push({
                id: categoryId,
                name: window.categoryData[categoryId].name
            });
        }
    }
    
    // Trier par ordre alphabétique
    compatibleCategories.sort((a, b) => a.name.localeCompare(b.name));
    
    // Ajouter les options triées
    compatibleCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.text = category.name;
        categorySelect.appendChild(option);
    });
    
    // Vérifier si une catégorie suggérée est disponible
    const suggestedCategory = document.getElementById('suggested-category');
    if (suggestedCategory && suggestedCategory.value) {
        for (let i = 0; i < categorySelect.options.length; i++) {
            if (categorySelect.options[i].value === suggestedCategory.value) {
                categorySelect.selectedIndex = i;
                break;
            }
        }
    }
};