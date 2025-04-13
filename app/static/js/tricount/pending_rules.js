// app/static/js/tricount/pending_rules.js

/**
 * Module pour gérer l'édition des règles en attente de confirmation
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les composants
    initToolTips();
    initEditButtons();
    
    /**
     * Initialise les tooltips Bootstrap
     */
    function initToolTips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function(tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    /**
     * Initialise les boutons d'édition des règles en attente
     */
    function initEditButtons() {
        const editButtons = document.querySelectorAll('.edit-pending-btn');
        const editModal = new bootstrap.Modal(document.getElementById('editPendingModal'));
        const saveButton = document.getElementById('save-pending-edit');
        
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const pendingId = this.dataset.pendingId;
                const expenseId = this.dataset.expenseId;
                const ruleId = this.dataset.ruleId;
                
                // Charger les détails de l'application en attente
                loadPendingDetails(pendingId, expenseId, ruleId, function() {
                    // Ouvrir le modal après chargement des données
                    editModal.show();
                });
            });
        });
        
        // Gestion du bouton de sauvegarde
        if (saveButton) {
            saveButton.addEventListener('click', function() {
                savePendingEdit();
            });
        }
    }
    
    /**
     * Charge les détails d'une application en attente
     * @param {string} pendingId - ID de l'application en attente
     * @param {string} expenseId - ID de la dépense
     * @param {string} ruleId - ID de la règle
     * @param {Function} callback - Fonction à exécuter après chargement
     */
    function loadPendingDetails(pendingId, expenseId, ruleId, callback) {
        // Endpoint pour obtenir les détails (à implémenter dans le backend)
        const detailsUrl = window.pendingDetailsUrl.replace('0', pendingId);
        
        // Mettre à jour l'ID dans le formulaire
        document.getElementById('pending-id').value = pendingId;
        
        // Mettre à jour l'URL du formulaire
        const form = document.getElementById('edit-pending-form');
        form.action = window.pendingRuleEditUrl.replace('0', pendingId);
        
        // Si l'URL de détails existe, charger via AJAX
        if (window.pendingDetailsUrl) {
            fetch(detailsUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        populateModalWithData(data, callback);
                    } else {
                        console.error('Error fetching pending details:', data.error);
                        alert('Erreur lors du chargement des détails.');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    // En cas d'erreur, continuer avec les données disponibles dans le DOM
                    populateModalWithMinimalData(pendingId, expenseId, ruleId);
                    if (callback) callback();
                });
        } else {
            // Pas d'URL pour les détails, utiliser les données du DOM
            populateModalWithMinimalData(pendingId, expenseId, ruleId);
            if (callback) callback();
        }
    }
    
    /**
     * Pré-remplit le modal avec les données de base tirées du DOM
     * @param {string} pendingId - ID de l'application en attente
     * @param {string} expenseId - ID de la dépense
     * @param {string} ruleId - ID de la règle
     */
    function populateModalWithMinimalData(pendingId, expenseId, ruleId) {
        // Trouver la ligne de la table correspondant à cette dépense
        const row = document.querySelector(`[data-pending-id="${pendingId}"]`).closest('tr');
        
        if (row) {
            // Extraire les informations de base
            const cells = row.querySelectorAll('td');
            const merchant = cells[1].textContent.trim();
            const description = cells[2].textContent.trim();
            
            // Récupérer le montant formaté
            const amountCell = cells[3];
            const amount = amountCell.textContent.trim();
            
            // Mettre à jour les champs de base
            document.getElementById('edit-merchant').value = merchant;
            document.getElementById('edit-amount').value = amount;
            
            // Pour les sélecteurs, on utilisera les valeurs par défaut de la règle
            createDefaultSelects(ruleId);
        }
    }
    
    /**
     * Crée les sélecteurs par défaut basés sur la règle
     * @param {string} ruleId - ID de la règle
     */
    function createDefaultSelects(ruleId) {
        // Créer les conteneurs pour les sélecteurs
        const flagContainer = document.getElementById('flag-select-container');
        const categoryContainer = document.getElementById('category-select-container');
        
        // Vider les conteneurs
        flagContainer.innerHTML = '';
        categoryContainer.innerHTML = '';
        
        // Créer les sélecteurs avec des ID uniques
        const flagSelectId = 'edit-flag-id';
        const categorySelectId = 'edit-category-id';
        
        // Créer le sélecteur de flag
        const flagSelect = document.createElement('select');
        flagSelect.id = flagSelectId;
        flagSelect.name = 'flag_id';
        flagSelect.className = 'form-select flag-select';
        flagSelect.setAttribute('data-flag-select', 'true');
        flagSelect.setAttribute('data-placeholder', 'Choisir un type');
        
        // Ajouter l'option vide
        const emptyFlagOption = document.createElement('option');
        emptyFlagOption.value = '';
        emptyFlagOption.textContent = 'Choisir un type';
        flagSelect.appendChild(emptyFlagOption);
        
        // Ajouter les options de flag depuis window.flagData
        if (window.flagData) {
            Object.keys(window.flagData).forEach(flagId => {
                const flag = window.flagData[flagId];
                const option = document.createElement('option');
                option.value = flagId;
                option.textContent = flag.name;
                
                // Ajouter les données pour le formatage
                option.dataset.color = flag.color;
                if (flag.iconify_id) option.dataset.iconifyId = flag.iconify_id;
                if (flag.icon) option.dataset.iconClass = flag.icon;
                
                flagSelect.appendChild(option);
            });
        }
        
        // Créer le sélecteur de catégorie
        const categorySelect = document.createElement('select');
        categorySelect.id = categorySelectId;
        categorySelect.name = 'category_id';
        categorySelect.className = 'form-select category-select';
        categorySelect.setAttribute('data-category-select', 'true');
        categorySelect.setAttribute('data-placeholder', 'Choisir une catégorie');
        categorySelect.setAttribute('data-flag-select', flagSelectId);
        
        // Ajouter l'option vide
        const emptyCategoryOption = document.createElement('option');
        emptyCategoryOption.value = '';
        emptyCategoryOption.textContent = 'Choisir une catégorie';
        categorySelect.appendChild(emptyCategoryOption);
        
        // Ajouter les options de catégorie depuis window.categoryData
        if (window.categoryData) {
            Object.keys(window.categoryData).forEach(categoryId => {
                const category = window.categoryData[categoryId];
                const option = document.createElement('option');
                option.value = categoryId;
                option.textContent = category.name;
                
                // Ajouter les flags associés
                if (category.flagIds && Array.isArray(category.flagIds)) {
                    option.dataset.flags = JSON.stringify(category.flagIds);
                }
                
                // Ajouter les données pour le formatage
                option.dataset.color = category.color;
                if (category.iconify_id) option.dataset.iconifyId = category.iconify_id;
                
                categorySelect.appendChild(option);
            });
        }
        
        // Ajouter les sélecteurs aux conteneurs
        flagContainer.appendChild(flagSelect);
        categoryContainer.appendChild(categorySelect);
        
        // Initialiser les sélecteurs améliorés
        if (typeof $ !== 'undefined' && $.fn.select2) {
            $(flagSelect).select2({
                theme: 'bootstrap-5',
                width: '100%',
                placeholder: 'Choisir un type',
                allowClear: true,
                templateResult: window.formatFlagOption || formatFlagOption,
                templateSelection: window.formatFlagSelection || formatFlagSelection,
                escapeMarkup: function(markup) { return markup; }
            });
            
            $(categorySelect).select2({
                theme: 'bootstrap-5',
                width: '100%',
                placeholder: 'Choisir une catégorie',
                allowClear: true,
                templateResult: window.formatCategoryOption || formatCategoryOption,
                templateSelection: window.formatCategorySelection || formatCategorySelection,
                escapeMarkup: function(markup) { return markup; }
            });
        }
        
        // Initialiser le filtrage des catégories
        if (window.CategorySelect && typeof window.CategorySelect.init === 'function') {
            window.CategorySelect.init();
        }
        
        // Actualiser Iconify
        if (window.Iconify) {
            window.Iconify.scan();
        }
    }
    
    /**
     * Remplit le modal avec les données reçues de l'API
     * @param {Object} data - Données de l'application en attente
     * @param {Function} callback - Fonction à exécuter après remplissage
     */
    function populateModalWithData(data, callback) {
        // Mettre à jour les champs de base
        document.getElementById('edit-merchant').value = data.expense.merchant;
        document.getElementById('edit-amount').value = data.expense.is_debit ? 
            `-${data.expense.amount.toFixed(2)} €` : 
            `${data.expense.amount.toFixed(2)} €`;
        document.getElementById('edit-notes').value = data.expense.notes || '';
        
        // Créer les sélecteurs
        createDefaultSelects(data.rule.id);
        
        // Définir les valeurs des sélecteurs
        const flagSelect = document.getElementById('edit-flag-id');
        const categorySelect = document.getElementById('edit-category-id');
        
        if (flagSelect && data.rule.flag_id) {
            flagSelect.value = data.rule.flag_id;
            
            // Pour Select2
            if (typeof $ !== 'undefined' && $.fn.select2) {
                $(flagSelect).val(data.rule.flag_id).trigger('change');
            }
        }
        
        if (categorySelect && data.rule.category_id) {
            categorySelect.value = data.rule.category_id;
            
            // Pour Select2
            if (typeof $ !== 'undefined' && $.fn.select2) {
                $(categorySelect).val(data.rule.category_id).trigger('change');
            }
        }
        
        // Exécuter le callback
        if (callback) callback();
    }
    
    /**
     * Fonctions de formatage pour Select2 si window.formatX n'existe pas
     */
    function formatFlagOption(flag) {
        if (!flag.id) return flag.text;
        
        const $flag = $(flag.element);
        const color = $flag.data('color') || '#ccc';
        const iconifyId = $flag.data('iconify-id');
        const iconClass = $flag.data('icon-class');
        
        let iconHtml = '';
        if (iconifyId) {
            iconHtml = `<span class="iconify me-2" data-icon="${iconifyId}"></span>`;
        } else if (iconClass) {
            iconHtml = `<i class="fas ${iconClass} me-2"></i>`;
        } else {
            iconHtml = `<i class="fas fa-tag me-2"></i>`;
        }
        
        return `<div style="display: flex; align-items: center;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color}; margin-right: 8px;"></div>
                    ${iconHtml}
                    <span>${flag.text}</span>
                </div>`;
    }
    
    function formatFlagSelection(flag) {
        if (!flag.id) return flag.text;
        
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
    
    function formatCategoryOption(category) {
        if (!category.id) return category.text;
        
        const categoryData = window.categoryData[category.id] || {};
        const color = categoryData.color || '#e9ecef';
        const iconifyId = categoryData.iconify_id;
        
        let iconHtml = '';
        if (iconifyId) {
            iconHtml = `<span class="iconify me-2" data-icon="${iconifyId}"></span>`;
        } else {
            iconHtml = `<i class="fas fa-folder me-2"></i>`;
        }
        
        return `<div style="display: flex; align-items: center; padding: 4px 0">
                    <div style="min-width: 4px; width: 4px; height: 20px; background-color: ${color}; margin-right: 8px;"></div>
                    ${iconHtml}
                    <span>${category.text}</span>
                </div>`;
    }
    
    function formatCategorySelection(category) {
        if (!category.id) return category.text;
        
        const categoryData = window.categoryData[category.id] || {};
        const color = categoryData.color || '#e9ecef';
        const iconifyId = categoryData.iconify_id;
        
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
    
    /**
     * Enregistre les modifications d'une application en attente
     */
    function savePendingEdit() {
        const form = document.getElementById('edit-pending-form');
        
        // Vérifier que le formulaire existe
        if (!form) return;
        
        // Soumettre le formulaire
        form.submit();
    }
});