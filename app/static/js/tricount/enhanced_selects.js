// app/static/js/tricount/enhanced_selects.js

/**
 * Module pour améliorer les selects avec Select2 et ajouter des icônes
 */
(function() {
    // Variable pour éviter les boucles infinies
    let flagSelectionInProgress = false;
    let categorySelectionInProgress = false;
    
    // Initialiser au chargement du document
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Initializing enhanced selects...");
        initSelect2();
    });

    /**
     * Initialise Select2 pour les sélecteurs de catégories et flags
     */
    function initSelect2() {
        // Vérifier que Select2 est disponible
        if (typeof $.fn.select2 !== 'function') {
            console.error("Select2 n'est pas disponible. Vérifiez l'inclusion des scripts.");
            return;
        }

        // Configuration pour les sélecteurs de flag
        $('.flag-select').each(function() {
            const flagSelect = $(this);
            const flagSelectId = flagSelect.attr('id');
            const expenseId = flagSelect.data('expense-id');
            
            flagSelect.select2({
                theme: 'bootstrap-5',
                width: '100%',
                placeholder: flagSelect.data('placeholder') || 'Choisir un type',
                allowClear: true,
                minimumResultsForSearch: 10, // Cacher la recherche s'il y a moins de 10 options
                templateResult: formatFlagOption,
                templateSelection: formatFlagSelection,
                escapeMarkup: function(markup) { return markup; } // Permettre le HTML
            });
            
            // *** AJOUT - Événement spécial pour les filtres AJAX ***
            if (flagSelect.closest('#filter-form[data-ajax-filter="true"]').length > 0) {
                flagSelect.on('select2:select', function() {
                    console.log("Flag sélectionné dans un formulaire de filtres AJAX");
                    // Déclencher la fonction triggerFilter du module de filtres
                    if (window.triggerFilter) {
                        window.triggerFilter();
                    } else if (typeof triggerFilter === 'function') {
                        triggerFilter();
                    }
                });
            }
            
            flagSelect.on('change', function() {
                // Éviter les boucles infinies
                if (flagSelectionInProgress) return;
                flagSelectionInProgress = true;
                
                // CORRECTION: S'assurer que la valeur est correctement parsée
                let flagId = null;
                const flagValue = $(this).val();
                
                // Initialiser le log
                console.log(`Flag changé à: ${flagValue}`);
                
                // Ne considérer la valeur que si elle est valide
                if (flagValue && flagValue !== '-1' && flagValue !== '') {
                    flagId = parseInt(flagValue);
                    if (isNaN(flagId)) {
                        console.warn(`La valeur du flag '${flagValue}' n'est pas un nombre valide`);
                        flagId = null;
                    } else {
                        console.log(`Flag changé à ID=${flagId} pour sélecteur ${flagSelectId}`);
                    }
                } else {
                    console.log(`Flag réinitialisé (valeur: ${flagValue}) pour sélecteur ${flagSelectId}`);
                }
                
                try {
                    // Récupérer le select de catégorie correspondant
                    let categorySelectId;
                    
                    // Dans le contexte de l'édition d'une dépense
                    if (flagSelectId === 'edit-flag') {
                        categorySelectId = 'edit-category';
                    } 
                    // Dans le contexte de la liste des dépenses
                    else if (expenseId) {
                        categorySelectId = `category-${expenseId}`;
                    }
                    // Sinon, chercher par data-attribute
                    else {
                        categorySelectId = $(this).data('category-select');
                    }
                    
                    const categorySelect = $(`#${categorySelectId}`);
                    
                    if (categorySelect.length) {
                        // 1. Déclencher d'abord l'événement natif pour la logique existante
                        const nativeSelect = document.getElementById(categorySelectId);
                        const nativeFlagSelect = document.getElementById(flagSelectId);
                        
                        if (nativeSelect && nativeFlagSelect) {
                            nativeSelect.flagSelect = nativeFlagSelect;
                            const event = new Event('change');
                            nativeFlagSelect.dispatchEvent(event);
                        }
                        
                        // 2. Détruire et recréer Select2 pour que les changements prennent effet
                        setTimeout(function() {
                            try {
                                categorySelect.select2('destroy');
                                categorySelect.select2({
                                    theme: 'bootstrap-5',
                                    width: '100%',
                                    placeholder: categorySelect.data('placeholder') || 'Choisir une catégorie',
                                    allowClear: true,
                                    minimumResultsForSearch: 10,
                                    templateResult: formatCategoryOption,
                                    templateSelection: formatCategorySelection,
                                    escapeMarkup: function(markup) { return markup; }
                                });
                                
                                // Actualiser les icônes Iconify
                                refreshIconify();
                            } catch (e) {
                                console.error("Erreur lors de la reconstruction du select2:", e);
                            }
                        }, 100);
                    }
                } finally {
                    // Réinitialiser le flag de protection après un délai
                    setTimeout(() => {
                        flagSelectionInProgress = false;
                    }, 200);
                }
            });
        });
        
        // Configuration pour les sélecteurs de catégorie
        $('.category-select').each(function() {
            const categorySelect = $(this);
            
            categorySelect.select2({
                theme: 'bootstrap-5',
                width: '100%',
                placeholder: categorySelect.data('placeholder') || 'Choisir une catégorie',
                allowClear: true,
                minimumResultsForSearch: 10,
                templateResult: formatCategoryOption,
                templateSelection: formatCategorySelection,
                escapeMarkup: function(markup) { return markup; }
            });
            
            // *** AJOUT - Événement spécial pour les filtres AJAX ***
            if (categorySelect.closest('#filter-form[data-ajax-filter="true"]').length > 0) {
                categorySelect.on('select2:select', function() {
                    console.log("Catégorie sélectionnée dans un formulaire de filtres AJAX");
                    // Déclencher la fonction triggerFilter du module de filtres
                    if (window.triggerFilter) {
                        window.triggerFilter();
                    } else if (typeof triggerFilter === 'function') {
                        triggerFilter();
                    }
                });
            }
            
            // Écouter les changements de catégorie
            categorySelect.on('change', function() {
                if (categorySelectionInProgress) return;
                categorySelectionInProgress = true;
                
                try {
                    // Logique additionnelle si nécessaire
                    console.log("Catégorie changée:", $(this).val());
                } finally {
                    setTimeout(() => {
                        categorySelectionInProgress = false;
                    }, 100);
                }
            });
        });
        
        // Actualiser les icônes après initialisation de Select2
        refreshIconify();
    }
    
    /**
     * Actualise les icônes Iconify dans le DOM
     */
    function refreshIconify() {
        console.log("Refreshing Iconify icons...");
        setTimeout(function() {
            if (window.Iconify) {
                window.Iconify.scan();
            }
        }, 200);
    }
    
    /**
     * Formate une option de flag dans le menu déroulant
     * @param {Object} flag - L'option de sélection
     * @returns {string} HTML formaté pour l'option
     */
    function formatFlagOption(flag) {
        if (!flag.id) {
            return flag.text; // Skip placeholder
        }
        
        const $flag = $(flag.element);
        const color = $flag.data('color') || '#ccc';
        const iconifyId = $flag.data('iconify-id');
        const iconClass = $flag.data('icon-class');
        
        let iconHtml = '';
        if (iconifyId) {
            // Utiliser une icône Iconify si disponible
            iconHtml = `<span class="iconify me-2" data-icon="${iconifyId}"></span>`;
        } else if (iconClass) {
            // Sinon utiliser Font Awesome
            iconHtml = `<i class="fas ${iconClass} me-2"></i>`;
        } else {
            // Icône par défaut
            iconHtml = `<i class="fas fa-tag me-2"></i>`;
        }
        
        return `<div style="display: flex; align-items: center;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color}; margin-right: 8px;"></div>
                    ${iconHtml}
                    <span>${flag.text}</span>
                </div>`;
    }
    
    /**
     * Formate un flag sélectionné
     * @param {Object} flag - L'option sélectionnée
     * @returns {string} HTML formaté pour l'option sélectionnée
     */
    function formatFlagSelection(flag) {
        if (!flag.id) {
            return flag.text; // Skip placeholder
        }
        
        const $flag = $(flag.element);
        const color = $flag.data('color') || '#ccc';
        const iconifyId = $flag.data('iconify-id');
        const iconClass = $flag.data('icon-class');
        
        let iconHtml = '';
        if (iconifyId) {
            iconHtml = `<span class="iconify me-1" data-icon="${iconifyId}"></span>`;
        } else if (iconClass) {
            iconHtml = `<i class="fas ${iconClass} me-1"></i>`;
        } else {
            iconHtml = `<i class="fas fa-tag me-1"></i>`;
        }
        
        return `<div style="display: flex; align-items: center;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; margin-right: 8px;"></div>
                    ${iconHtml}
                    <span>${flag.text}</span>
                </div>`;
    }
    
    /**
     * Formate une option de catégorie dans le menu déroulant
     * @param {Object} category - L'option de sélection
     * @returns {string} HTML formaté pour l'option
     */
    function formatCategoryOption(category) {
        if (!category.id) {
            return category.text; // Skip placeholder
        }
        
        // Utiliser directement les données d'attribut de l'option si disponibles
        const $category = $(category.element);
        const dataColor = $category.data('color');
        const dataIconifyId = $category.data('iconify-id');
        
        // Sinon, utiliser les données de window.categoryData
        const categoryData = window.categoryData && window.categoryData[category.id] ? window.categoryData[category.id] : {};
        const color = dataColor || categoryData.color || '#e9ecef';
        const iconifyId = dataIconifyId || categoryData.iconify_id;
        
        let iconHtml = '';
        if (iconifyId) {
            // Utiliser une icône Iconify si disponible
            iconHtml = `<span class="iconify me-2" data-icon="${iconifyId}"></span>`;
        } else {
            // Icône par défaut
            iconHtml = `<i class="fas fa-folder me-2"></i>`;
        }
        
        return `<div style="display: flex; align-items: center; padding: 4px 0">
                    <div style="min-width: 4px; width: 4px; height: 20px; background-color: ${color}; margin-right: 8px;"></div>
                    ${iconHtml}
                    <span>${category.text}</span>
                </div>`;
    }
    
    /**
     * Formate une catégorie sélectionnée
     * @param {Object} category - L'option sélectionnée
     * @returns {string} HTML formaté pour l'option sélectionnée
     */
    function formatCategorySelection(category) {
        if (!category.id) {
            return category.text; // Skip placeholder
        }
        
        // Utiliser directement les données d'attribut de l'option si disponibles
        const $category = $(category.element);
        const dataColor = $category.data('color');
        const dataIconifyId = $category.data('iconify-id');
        
        // Sinon, utiliser les données de window.categoryData
        const categoryData = window.categoryData && window.categoryData[category.id] ? window.categoryData[category.id] : {};
        const color = dataColor || categoryData.color || '#e9ecef';
        const iconifyId = dataIconifyId || categoryData.iconify_id;
        
        let iconHtml = '';
        if (iconifyId) {
            iconHtml = `<span class="iconify me-1" data-icon="${iconifyId}"></span>`;
        } else {
            iconHtml = `<i class="fas fa-folder me-1"></i>`;
        }
        
        return `<div style="display: flex; align-items: center;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; margin-right: 8px;"></div>
                    ${iconHtml}
                    <span>${category.text}</span>
                </div>`;
    }
    
    // Exposer les fonctions pour une utilisation externe
    window.EnhancedSelects = {
        init: initSelect2,
        refresh: refreshIconify,
        formatFlagOption: formatFlagOption,
        formatCategoryOption: formatCategoryOption
    };
})();

// Actualiser les icônes quand le dropdown s'ouvre
$(document).on('select2:open', function() {
    // Attendre un court instant pour que le DOM soit prêt
    setTimeout(function() {
        if (window.Iconify) {
            window.Iconify.scan();
        }
    }, 100);
});

// Actualiser les icônes après que le dropdown est fermé (pour les sélections)
$(document).on('select2:close', function() {
    setTimeout(function() {
        if (window.Iconify) {
            window.Iconify.scan();
        }
    }, 100);
});