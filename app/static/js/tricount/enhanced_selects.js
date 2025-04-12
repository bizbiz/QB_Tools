// app/static/js/tricount/enhanced_selects.js

/**
 * Module pour améliorer les selects avec Select2 et ajouter des icônes
 */
(function() {
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
            
            // Conserver le comportement actuel : mise à jour des catégories lors du changement de flag
            flagSelect.on('change', function() {
                const expenseId = $(this).data('expense-id');
                const categorySelect = $(`#category-${expenseId}`);
                
                // Déclencher l'événement natif pour que le code existant fonctionne
                if (categorySelect.length) {
                    const nativeSelect = document.getElementById(`category-${expenseId}`);
                    if (nativeSelect) {
                        const event = new Event('change');
                        nativeSelect.dispatchEvent(event);
                    }
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
        });
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
        
        const $category = $(category.element);
        const color = $category.data('color') || '#e9ecef';
        const iconifyId = $category.data('iconify-id');
        const iconEmoji = $category.data('icon-emoji');
        const iconClass = $category.data('icon-class');
        
        let iconHtml = '';
        if (iconifyId) {
            // Utiliser une icône Iconify si disponible
            iconHtml = `<span class="iconify me-2" data-icon="${iconifyId}"></span>`;
        } else if (iconEmoji) {
            // Utiliser un emoji
            iconHtml = `<span class="me-2">${iconEmoji}</span>`;
        } else if (iconClass) {
            // Sinon utiliser Font Awesome
            iconHtml = `<i class="fas ${iconClass} me-2"></i>`;
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
        
        const $category = $(category.element);
        const color = $category.data('color') || '#e9ecef';
        const iconifyId = $category.data('iconify-id');
        const iconEmoji = $category.data('icon-emoji');
        const iconClass = $category.data('icon-class');
        
        let iconHtml = '';
        if (iconifyId) {
            iconHtml = `<span class="iconify me-1" data-icon="${iconifyId}"></span>`;
        } else if (iconEmoji) {
            iconHtml = `<span class="me-1">${iconEmoji}</span>`;
        } else if (iconClass) {
            iconHtml = `<i class="fas ${iconClass} me-1"></i>`;
        } else {
            iconHtml = `<i class="fas fa-folder me-1"></i>`;
        }
        
        return `<div style="display: flex; align-items: center;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; margin-right: 8px;"></div>
                    ${iconHtml}
                    <span>${category.text}</span>
                </div>`;
    }
})();