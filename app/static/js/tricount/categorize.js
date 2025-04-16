// app/static/js/tricount/categorize.js

document.addEventListener('DOMContentLoaded', function() {
    // Éléments DOM
    const expensesContainer = document.getElementById('expenses-container');
    const saveButtons = document.querySelectorAll('.save-button');
    const expensesCount = document.getElementById('expenses-count');
    const totalCount = document.getElementById('total-count');
    const displayRange = document.getElementById('display-range');
    const prevButton = document.getElementById('prev-expenses');
    const nextButton = document.getElementById('next-expenses');
    
    // Éléments de tri
    const sortBySelect = document.getElementById('sort-by');
    const sortOrderSelect = document.getElementById('sort-order');
    const applySortButton = document.getElementById('apply-sort');
    
    // Variables de pagination
    const itemsPerPage = window.expensePagination.itemsPerPage || 9;
    let currentPage = window.expensePagination.currentPage || 0;
    let totalPages = window.expensePagination.totalPages || 1;
    
    // Options de tri (valeurs initiales chargées depuis le serveur)
    let sortBy = window.sortOptions.sortBy || 'incomplete';
    let sortOrder = window.sortOptions.sortOrder || 'desc';
    
    // Liste d'IDs des dépenses à catégoriser
    let pendingExpenseIds = window.allExpenses || [];
    
    // Liste d'IDs des dépenses actuellement affichées
    let displayedExpenseIds = [];
    updateDisplayedExpenses();
    
    // Configuration des boutons de pagination
    updatePaginationButtons();
    
    // Initialiser les tooltips
    initTooltips();

    // Initialiser les champs de renommage
    initRenamingFields();
    
    // S'assurer que les icônes sont bien chargées au démarrage
    refreshAllIcons();
    
    // Gestionnaire d'événement pour appliquer le tri
    if (applySortButton) {
        applySortButton.addEventListener('click', function() {
            const newSortBy = sortBySelect.value;
            const newSortOrder = sortOrderSelect.value;
            
            // Vérifier si les options de tri ont changé
            if (newSortBy !== sortBy || newSortOrder !== sortOrder) {
                sortBy = newSortBy;
                sortOrder = newSortOrder;
                
                // Ajouter l'indicateur de chargement
                applySortButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Chargement...';
                applySortButton.disabled = true;
                
                // Rediriger vers la même page avec les nouveaux paramètres de tri
                window.location.href = `${window.location.pathname}?sort_by=${sortBy}&sort_order=${sortOrder}`;
            }
        });
    }
    
    // Gestionnaire d'événement pour le bouton Précédent
    prevButton.addEventListener('click', function() {
        if (currentPage > 0) {
            currentPage--;
            showExpensesByPage(currentPage);
            updatePaginationButtons();
            
            // Réinitialiser les Select2 et les icônes après avoir changé la visibilité des éléments
            setTimeout(() => {
                initializePageSelect2();
                initTooltips(); // Réinitialiser les tooltips après mise à jour de la page
                refreshAllIcons(); // Réactualiser toutes les icônes
            }, 150);
        }
    });
    
    // Gestionnaire d'événement pour le bouton Suivant
    nextButton.addEventListener('click', function() {
        if (currentPage < totalPages - 1) {
            currentPage++;
            showExpensesByPage(currentPage);
            updatePaginationButtons();
            
            // Réinitialiser les Select2 et les icônes après avoir changé la visibilité des éléments
            setTimeout(() => {
                initializePageSelect2();
                initTooltips(); // Réinitialiser les tooltips après mise à jour de la page
                refreshAllIcons(); // Réactualiser toutes les icônes
            }, 150);
        }
    });
    
    /**
     * Force le rechargement de toutes les icônes
     */
    function refreshAllIcons() {
        // S'assurer qu'Iconify est disponible
        if (window.Iconify) {
            console.log("Refreshing all Iconify icons...");
            window.Iconify.scan();
            
            // Double-scan pour s'assurer que tout est chargé
            setTimeout(() => {
                window.Iconify.scan();
            }, 300);
        }
        
        // Utiliser également la fonction refresh d'EnhancedSelects si disponible
        if (window.EnhancedSelects && typeof window.EnhancedSelects.refresh === 'function') {
            window.EnhancedSelects.refresh();
        }
    }
    
    /**
     * Initialise les tooltips Bootstrap sur la page
     */
    function initTooltips() {
        // Détruire les tooltips existants pour éviter les doublons
        var tooltipList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipList.forEach(function(tooltipEl) {
            var tooltip = bootstrap.Tooltip.getInstance(tooltipEl);
            if (tooltip) {
                tooltip.dispose();
            }
        });
        
        // Créer de nouveaux tooltips
        tooltipList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    /**
     * Fonction pour réinitialiser les Select2 sur la page actuelle
     */
    function initializePageSelect2() {
        // Sélectionner uniquement les éléments visibles
        const visibleElements = document.querySelectorAll('.expense-card-container:not(.hide-card)');
        
        // Parcourir chaque élément visible
        visibleElements.forEach(container => {
            const expenseId = container.dataset.expenseId;
            
            // Réinitialiser Select2 pour les flags et catégories
            const flagSelect = $(`#flag-${expenseId}`);
            const categorySelect = $(`#category-${expenseId}`);
            
            // Réinitialiser le sélecteur de flag
            if (flagSelect.length) {
                try {
                    // Vérifier si Select2 est déjà initialisé
                    if (flagSelect.data('select2')) {
                        flagSelect.select2('destroy');
                    }
                    
                    // Réinitialiser avec les options appropriées
                    flagSelect.select2({
                        theme: 'bootstrap-5',
                        width: '100%',
                        placeholder: flagSelect.data('placeholder') || 'Choisir un type',
                        allowClear: true,
                        minimumResultsForSearch: 10,
                        templateResult: formatFlagOption,
                        templateSelection: formatFlagSelection,
                        escapeMarkup: function(markup) { return markup; } // Permettre le HTML
                    });
                } catch (e) {
                    console.warn("Erreur lors de la réinitialisation du select2 flag:", e);
                }
            }
            
            // Réinitialiser le sélecteur de catégorie
            if (categorySelect.length) {
                try {
                    // Vérifier si Select2 est déjà initialisé
                    if (categorySelect.data('select2')) {
                        categorySelect.select2('destroy');
                    }
                    
                    // Réinitialiser avec les options appropriées
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
                } catch (e) {
                    console.warn("Erreur lors de la réinitialisation du select2 catégorie:", e);
                }
            }
        });
        
        // Lancer un scan des icônes après réinitialisation
        refreshAllIcons();
        // Réinitialiser les champs de renommage
        initRenamingFields();
    }
    
    /**
     * Formate une option de flag dans le menu déroulant (fonction dupliquée de enhanced_selects.js)
     */
    function formatFlagOption(flag) {
        if (!flag.id) {
            return flag.text; // Skip placeholder
        }
        
        const $flag = $(flag.element);
        const color = $flag.data('color') || '#ccc';
        const iconifyId = $flag.data('iconify-id');
        const iconClass = $flag.data('icon-class');
        
        // Chercher également dans window.flagData
        const flagData = window.flagData && window.flagData[flag.id] ? window.flagData[flag.id] : {};
        
        let iconHtml = '';
        if (iconifyId) {
            iconHtml = `<span class="iconify me-2" data-icon="${iconifyId}"></span>`;
        } else if (flagData.iconify_id) {
            iconHtml = `<span class="iconify me-2" data-icon="${flagData.iconify_id}"></span>`;
        } else if (iconClass) {
            iconHtml = `<i class="fas ${iconClass} me-2"></i>`;
        } else if (flagData.icon) {
            iconHtml = `<i class="fas ${flagData.icon} me-2"></i>`;
        } else {
            iconHtml = `<i class="fas fa-tag me-2"></i>`;
        }
        
        return `<div style="display: flex; align-items: center;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color || flagData.color || '#ccc'}; margin-right: 8px;"></div>
                    ${iconHtml}
                    <span>${flag.text}</span>
                </div>`;
    }
    
    /**
     * Formate un flag sélectionné (fonction dupliquée de enhanced_selects.js)
     */
    function formatFlagSelection(flag) {
        if (!flag.id) {
            return flag.text; // Skip placeholder
        }
        
        const $flag = $(flag.element);
        const color = $flag.data('color') || '#ccc';
        const iconifyId = $flag.data('iconify-id');
        const iconClass = $flag.data('icon-class');
        
        // Chercher également dans window.flagData
        const flagData = window.flagData && window.flagData[flag.id] ? window.flagData[flag.id] : {};
        
        let iconHtml = '';
        if (iconifyId) {
            iconHtml = `<span class="iconify me-1" data-icon="${iconifyId}"></span>`;
        } else if (flagData.iconify_id) {
            iconHtml = `<span class="iconify me-1" data-icon="${flagData.iconify_id}"></span>`;
        } else if (iconClass) {
            iconHtml = `<i class="fas ${iconClass} me-1"></i>`;
        } else if (flagData.icon) {
            iconHtml = `<i class="fas ${flagData.icon} me-1"></i>`;
        } else {
            iconHtml = `<i class="fas fa-tag me-1"></i>`;
        }
        
        return `<div style="display: flex; align-items: center;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${color || flagData.color || '#ccc'}; margin-right: 8px;"></div>
                    ${iconHtml}
                    <span>${flag.text}</span>
                </div>`;
    }
    
    /**
     * Formate une option de catégorie dans le menu déroulant (fonction dupliquée de enhanced_selects.js)
     */
    function formatCategoryOption(category) {
        if (!category.id) {
            return category.text; // Skip placeholder
        }
        
        // Chercher dans window.categoryData
        const categoryData = window.categoryData && window.categoryData[category.id] ? window.categoryData[category.id] : {};
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
    
    /**
     * Formate une catégorie sélectionnée (fonction dupliquée de enhanced_selects.js)
     */
    function formatCategorySelection(category) {
        if (!category.id) {
            return category.text; // Skip placeholder
        }
        
        // Chercher dans window.categoryData
        const categoryData = window.categoryData && window.categoryData[category.id] ? window.categoryData[category.id] : {};
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
     * Fonction pour mettre à jour la liste des dépenses actuellement affichées
     */
    function updateDisplayedExpenses() {
        displayedExpenseIds = [];
        
        // Parcourir tous les conteneurs de dépenses visibles
        document.querySelectorAll('.expense-card-container:not(.hide-card)').forEach(container => {
            displayedExpenseIds.push(container.dataset.expenseId);
        });
        
        console.log("Dépenses affichées:", displayedExpenseIds);
    }
    
    /**
     * Fonction pour afficher les dépenses par page
     * @param {number} page - Numéro de la page à afficher
     */
    function showExpensesByPage(page) {
        // Cacher toutes les dépenses
        document.querySelectorAll('.expense-card-container').forEach(container => {
            container.classList.add('hide-card');
        });
        
        // Calculer les indices de début et de fin
        const startIndex = page * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, pendingExpenseIds.length);
        
        // Afficher uniquement les dépenses de la page actuelle
        for (let i = startIndex; i < endIndex; i++) {
            const expenseId = pendingExpenseIds[i];
            const container = document.getElementById(`expense-container-${expenseId}`);
            
            if (container) {
                container.classList.remove('hide-card');
            }
        }
        
        // Mettre à jour la liste des dépenses affichées
        updateDisplayedExpenses();
    }
    
    /**
     * Fonction pour mettre à jour l'état des boutons de pagination
     */
    function updatePaginationButtons() {
        prevButton.disabled = currentPage === 0;
        nextButton.disabled = currentPage >= totalPages - 1;
        
        // Mettre à jour les compteurs
        if (expensesCount) expensesCount.textContent = pendingExpenseIds.length;
        if (totalCount) totalCount.textContent = pendingExpenseIds.length;
        
        // Mise à jour de la plage d'affichage
        if (displayRange) {
            const startNumber = currentPage * itemsPerPage + 1;
            const endNumber = Math.min((currentPage + 1) * itemsPerPage, pendingExpenseIds.length);
            displayRange.textContent = `${pendingExpenseIds.length > 0 ? startNumber : 0}-${endNumber}`;
        }
    }
    
    /**
     * Affiche un message de succès après la catégorisation
     */
    function showSuccessMessage() {
        document.getElementById('expenses-container').innerHTML = `
            <div class="col-12">
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    Toutes les dépenses ont été complètement catégorisées. Vous pouvez 
                    <a href="/tricount/import">importer de nouvelles dépenses</a> 
                    ou consulter la <a href="/tricount/expenses">liste complète des dépenses</a>.
                </div>
            </div>
        `;
        
        // Masquer les boutons de pagination et de tri
        const paginationElement = document.querySelector('.expense-pagination');
        if (paginationElement) {
            paginationElement.style.display = 'none';
        }
        
        const sortControls = document.querySelector('.sort-controls');
        if (sortControls) {
            sortControls.style.display = 'none';
        }
    }


    /**
     * Initialise les champs de renommage avec détection des modifications
     */
    function initRenamingFields() {
        // Détecter les modifications dans les champs de renommage de commerçant
        document.querySelectorAll('input[id^="renamed-merchant-"]').forEach(input => {
            // Ajouter l'attribut 'data-original' pour suivre la valeur d'origine
            input.setAttribute('data-original', input.value);
            
            // Marquer comme modifié si déjà une valeur
            if (input.value.trim() !== '') {
                input.classList.add('modified');
                
                // Chercher l'accordéon parent et l'ouvrir par défaut si des modifications existent
                const accordionBtn = input.closest('.accordion-collapse').previousElementSibling.querySelector('.accordion-button');
                if (accordionBtn && accordionBtn.classList.contains('collapsed')) {
                    accordionBtn.click();
                }
            }
            
            // Ajouter l'écouteur d'événement pour suivre les modifications
            input.addEventListener('input', function() {
                const originalValue = this.getAttribute('data-original') || '';
                const currentValue = this.value.trim();
                
                if (currentValue !== originalValue) {
                    this.classList.add('modified');
                } else {
                    this.classList.remove('modified');
                }
            });
        });
        
        // Détecter les modifications dans les champs de description personnalisée
        document.querySelectorAll('textarea[id^="notes-"]').forEach(textarea => {
            // Ajouter l'attribut 'data-original' pour suivre la valeur d'origine
            textarea.setAttribute('data-original', textarea.value);
            
            // Marquer comme modifié si déjà une valeur
            if (textarea.value.trim() !== '') {
                textarea.classList.add('modified');
                
                // Chercher l'accordéon parent et l'ouvrir par défaut si des modifications existent
                const accordionBtn = textarea.closest('.accordion-collapse').previousElementSibling.querySelector('.accordion-button');
                if (accordionBtn && accordionBtn.classList.contains('collapsed')) {
                    accordionBtn.click();
                }
            }
            
            // Ajouter l'écouteur d'événement pour suivre les modifications
            textarea.addEventListener('input', function() {
                const originalValue = this.getAttribute('data-original') || '';
                const currentValue = this.value.trim();
                
                if (currentValue !== originalValue) {
                    this.classList.add('modified');
                } else {
                    this.classList.remove('modified');
                }
            });
        });
    }

    /**
     * Vérifie si des modifications de renommage ont été faites
     * @param {string} expenseId - ID de la dépense à vérifier
     * @returns {boolean} Vrai si des modifications ont été faites
     */
    function hasRenamingChanges(expenseId) {
        const merchantInput = document.getElementById(`renamed-merchant-${expenseId}`);
        const notesTextarea = document.getElementById(`notes-${expenseId}`);
        
        let hasChanges = false;
        
        if (merchantInput) {
            const originalMerchant = merchantInput.getAttribute('data-original') || '';
            hasChanges = hasChanges || (merchantInput.value.trim() !== originalMerchant);
        }
        
        if (notesTextarea) {
            const originalNotes = notesTextarea.getAttribute('data-original') || '';
            hasChanges = hasChanges || (notesTextarea.value.trim() !== originalNotes);
        }
        
        return hasChanges;
    }
    
    // Gestionnaire pour les boutons d'enregistrement
    saveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const expenseId = this.dataset.expenseId;
            const form = document.getElementById(`categorize-form-${expenseId}`);
            const formData = new FormData(form);
            
            // Vérifier si une catégorie ou un type a été sélectionné
            const categoryId = formData.get('category_id');
            const flagId = formData.get('flag_id');
            const hasRenaming = hasRenamingChanges(expenseId);
            
            if (!categoryId && !flagId && !hasRenaming) {
                alert('Veuillez sélectionner au moins une catégorie, un type, ou effectuer un renommage avant d\'enregistrer.');
                return;
            }
            
            // Modifier le bouton pour indiquer le chargement
            const originalButtonContent = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';
            this.disabled = true;
            
            // URL pour l'API mise à jour
            const updateUrl = '/tricount/expenses/update';
            
            // Envoyer les données au serveur
            fetch(updateUrl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const container = document.getElementById(`expense-container-${expenseId}`);
                    const hasCategory = !!categoryId;
                    const hasFlag = !!flagId;
                    
                    // Si l'expense est complètement catégorisée (a une catégorie ET un flag)
                    if (hasCategory && hasFlag) {
                        // Animer la disparition
                        container.style.transition = 'opacity 0.5s ease';
                        container.style.opacity = '0';
                        
                        setTimeout(() => {
                            // Supprimer cette dépense de la liste
                            pendingExpenseIds = pendingExpenseIds.filter(id => id != expenseId);
                            
                            // Recalculer le nombre total de pages
                            totalPages = Math.ceil(pendingExpenseIds.length / itemsPerPage);
                            
                            // Si la page actuelle n'a plus de contenu et n'est pas la première page, revenir à la page précédente
                            if (currentPage > 0 && currentPage >= totalPages) {
                                currentPage--;
                            }
                            
                            // Marquer la carte comme cachée
                            container.classList.add('hide-card');
                            
                            // Si toutes les dépenses sont catégorisées, afficher un message
                            if (pendingExpenseIds.length === 0) {
                                showSuccessMessage();
                            } else {
                                // Sinon, mettre à jour l'affichage et la pagination
                                showExpensesByPage(currentPage);
                                updatePaginationButtons();
                                
                                // Réinitialiser les composants UI
                                setTimeout(() => {
                                    initializePageSelect2();
                                    initTooltips();
                                    refreshAllIcons();
                                }, 150);
                            }
                        }, 500);
                    } else {
                        // La dépense n'est que partiellement catégorisée, la mettre à jour sans la faire disparaître
                        
                        // Mettre à jour les indicateurs de complétion
                        const categoryIndicator = container.querySelector('.indicator:first-of-type');
                        const flagIndicator = container.querySelector('.indicator:last-of-type');
                        
                        if (categoryIndicator && hasCategory) {
                            categoryIndicator.classList.remove('incomplete');
                            categoryIndicator.classList.add('complete');
                        }
                        
                        if (flagIndicator && hasFlag) {
                            flagIndicator.classList.remove('incomplete');
                            flagIndicator.classList.add('complete');
                        }
                        if (hasRenaming && !hasCategory && !hasFlag && 
                            !container.dataset.hasCategory && !container.dataset.hasFlag) {
                            // Recharger la page après un délai
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                            return;
                        }
                        // Mettre à jour les attributs data pour le tri
                        container.dataset.hasCategory = hasCategory.toString();
                        container.dataset.hasFlag = hasFlag.toString();
                        
                        // Afficher un effet flash pour indiquer la mise à jour
                        container.classList.add('card-updated');
                        
                        // Restaurer le bouton
                        this.innerHTML = originalButtonContent;
                        this.disabled = false;
                        
                        // Retirer l'effet flash après un délai
                        setTimeout(() => {
                            container.classList.remove('card-updated');
                        }, 1000);
                        
                        // Si le tri est par niveau de complétion, recharger la page pour appliquer le nouveau tri
                        if (sortBy === 'incomplete') {
                            setTimeout(() => {
                                // Ajouter un paramètre timestamp pour éviter la mise en cache
                                window.location.href = `${window.location.pathname}?sort_by=${sortBy}&sort_order=${sortOrder}&t=${Date.now()}`;
                            }, 800);
                        }
                    }
                } else {
                    // Restaurer le bouton en cas d'erreur
                    this.innerHTML = originalButtonContent;
                    this.disabled = false;
                    
                    alert('Erreur lors de la mise à jour: ' + (data.error || 'Erreur inconnue'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                
                // Restaurer le bouton en cas d'erreur
                this.innerHTML = originalButtonContent;
                this.disabled = false;
                
                alert('Erreur de connexion au serveur.');
            });
        });
    });
});