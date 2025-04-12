// app/static/js/tricount/category_management.js

/**
 * Module pour gérer les catégories dans l'interface Tricount
 * Contient les fonctions de tri, d'édition et de gestion des aperçus
 */
(function() {
    // Variables principales
    let categoryTable = null;
    let deleteModal = null;
    let editModal = null;
    
    // Initialisation au chargement de la page
    document.addEventListener('DOMContentLoaded', function() {
        // Initialiser les composants principaux
        initTableSorting();
        initDeleteModal();
        initEditModal();
        initPreviewFunctionality();
        
        // Initialiser les tooltips
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.forEach(function (tooltipTriggerEl) {
                new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    });
    
    /**
     * Initialise la fonctionnalité de tri du tableau
     */
    function initTableSorting() {
        categoryTable = document.querySelector('.table');
        if (!categoryTable) return;
        
        const tableHeaders = categoryTable.querySelectorAll('th');
        
        tableHeaders.forEach((header, index) => {
            // Ignorer les colonnes non triables
            if (header.classList.contains('no-sort')) return;
            
            // Ajouter le style de curseur et l'événement de clic
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => sortTable(categoryTable, index));
            
            // Ajouter un indicateur de tri
            if (!header.querySelector('.sort-icon')) {
                const sortIcon = document.createElement('span');
                sortIcon.className = 'sort-icon';
                header.appendChild(sortIcon);
            }
        });
    }
    
    /**
     * Initialise la modal de suppression
     */
    function initDeleteModal() {
        const deleteModalElement = document.getElementById('deleteCategoryModal');
        if (!deleteModalElement) return;
        
        deleteModal = new bootstrap.Modal(deleteModalElement);
        const deleteButtons = document.querySelectorAll('.delete-category');
        const deleteCategoryName = document.getElementById('delete-category-name');
        const deleteCategoryForm = document.getElementById('delete-category-form');
        
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.dataset.id;
                const categoryName = this.dataset.name;
                
                if (deleteCategoryName) {
                    deleteCategoryName.textContent = categoryName;
                }
                
                if (deleteCategoryForm && window.categoryDeleteUrl) {
                    deleteCategoryForm.action = window.categoryDeleteUrl.replace('0', categoryId);
                }
                
                deleteModal.show();
            });
        });
    }
    
    /**
     * Initialise la modal d'édition
     */
    function initEditModal() {
        const editModalElement = document.getElementById('editCategoryModal');
        if (!editModalElement) return;
        
        editModal = new bootstrap.Modal(editModalElement);
        const editButtons = document.querySelectorAll('.edit-category');
        const editCategoryForm = document.getElementById('edit-category-form');
        const saveCategoryButton = document.getElementById('save-category');
        
        // Éléments du formulaire d'édition
        const editNameInput = document.getElementById('edit-name');
        const editDescriptionInput = document.getElementById('edit-description');
        const editColorInput = document.getElementById('edit-color');
        const editIconifyInput = document.getElementById('edit-iconify-id');
        
        // Éléments d'aperçu
        const editPreviewBadge = document.getElementById('edit-category-preview-badge');
        const editPreviewName = document.getElementById('edit-preview-name');
        const editPreviewIcon = document.getElementById('edit-preview-icon');
        const colorHexValue = document.getElementById('color-hex-value');
        
        // Gérer le clic sur les boutons d'édition
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.dataset.id;
                const categoryName = this.dataset.name;
                const categoryDescription = this.dataset.description || '';
                const categoryIconifyId = this.dataset.iconifyId || '';
                const categoryLegacyIcon = this.dataset.legacyIcon || '';
                const categoryColor = this.dataset.color || '#e9ecef';
                
                // Remplir le formulaire avec les données de la catégorie
                if (editNameInput) editNameInput.value = categoryName;
                if (editDescriptionInput) editDescriptionInput.value = categoryDescription;
                if (editColorInput) editColorInput.value = categoryColor;
                if (editIconifyInput) editIconifyInput.value = categoryIconifyId;
                
                // Mettre à jour l'aperçu
                updateEditPreview(
                    categoryName, 
                    categoryColor, 
                    categoryIconifyId, 
                    categoryLegacyIcon
                );
                
                // Récupérer les flags associés à cette catégorie
                fetch(`/tricount/categories/${categoryId}/info`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Mettre à jour les cases à cocher des flags
                            const flagCheckboxes = document.querySelectorAll('.edit-flag-checkbox');
                            flagCheckboxes.forEach(checkbox => {
                                const flagId = parseInt(checkbox.value);
                                
                                // Vérifier si les flags existent et sont un tableau
                                // Correction de l'erreur "Cannot read properties of undefined (reading 'some')"
                                const flags = data.category && data.category.flags;
                                const isChecked = Array.isArray(flags) ? 
                                    flags.some(flag => flag.id === flagId) : false;
                                
                                checkbox.checked = isChecked;
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        // Gérer l'erreur silencieusement - ne pas bloquer l'interface
                    });
                
                // Mettre à jour l'URL du formulaire
                if (editCategoryForm && window.categoryUpdateUrl) {
                    editCategoryForm.action = window.categoryUpdateUrl.replace('0', categoryId);
                }
                
                // Ouvrir la modal
                editModal.show();
                
                // Actualiser les icônes Iconify
                refreshIconify();
            });
        });
        
        // Soumettre le formulaire lors du clic sur Enregistrer
        if (saveCategoryButton) {
            saveCategoryButton.addEventListener('click', function() {
                if (editCategoryForm) {
                    editCategoryForm.submit();
                }
            });
        }
        
        /**
         * Met à jour l'aperçu dans la modal d'édition
         */
        function updateEditPreview(name, color, iconifyId, legacyIcon) {
            if (editPreviewName) editPreviewName.textContent = name;
            if (editPreviewBadge) editPreviewBadge.style.borderColor = color;
            if (colorHexValue) colorHexValue.textContent = color;
            
            if (editPreviewIcon) {
                if (iconifyId) {
                    editPreviewIcon.innerHTML = `<span class="iconify" data-icon="${iconifyId}"></span>`;
                } else if (legacyIcon) {
                    editPreviewIcon.innerHTML = `<i class="fas ${legacyIcon}"></i>`;
                } else {
                    editPreviewIcon.innerHTML = `<i class="fas fa-folder"></i>`;
                }
            }
            
            // Mettre à jour la prévisualisation de l'icône dans le champ
            const previewElem = document.getElementById('edit-iconify-id-preview');
            if (previewElem && iconifyId) {
                previewElem.innerHTML = `<span class="iconify" data-icon="${iconifyId}" style="font-size: 1.5rem;"></span>`;
                refreshIconify();
            }
        }
    }
    
    /**
     * Initialise les fonctionnalités d'aperçu en temps réel
     */
    function initPreviewFunctionality() {
        // Éléments du formulaire d'ajout
        const nameInput = document.getElementById('name');
        const colorInput = document.getElementById('color');
        const iconifyIdInput = document.getElementById('iconify_id');
        
        // Éléments d'aperçu pour le formulaire d'ajout
        const previewBadge = document.getElementById('category-preview-badge');
        const previewName = document.getElementById('preview-name');
        const previewIcon = document.getElementById('preview-emoji');
        
        // Mise à jour du nom en temps réel
        if (nameInput && previewName) {
            nameInput.addEventListener('input', function() {
                previewName.textContent = this.value || 'Nouvelle catégorie';
            });
        }
        
        // Mise à jour de la couleur en temps réel
        if (colorInput && previewBadge) {
            colorInput.addEventListener('input', function() {
                previewBadge.style.borderColor = this.value;
            });
        }
        
        // Mise à jour de l'icône en temps réel
        if (iconifyIdInput && previewIcon) {
            iconifyIdInput.addEventListener('change', function() {
                updateIconPreview(this.value, previewIcon);
            });
        }
        
        // Éléments du formulaire d'édition
        const editNameInput = document.getElementById('edit-name');
        const editColorInput = document.getElementById('edit-color');
        const editIconifyIdInput = document.getElementById('edit-iconify-id');
        
        // Éléments d'aperçu pour le formulaire d'édition
        const editPreviewBadge = document.getElementById('edit-category-preview-badge');
        const editPreviewName = document.getElementById('edit-preview-name');
        const editPreviewIcon = document.getElementById('edit-preview-icon');
        const colorHexValue = document.getElementById('color-hex-value');
        
        // Mise à jour du nom en temps réel dans le formulaire d'édition
        if (editNameInput && editPreviewName) {
            editNameInput.addEventListener('input', function() {
                editPreviewName.textContent = this.value || 'Nom de la catégorie';
            });
        }
        
        // Mise à jour de la couleur en temps réel dans le formulaire d'édition
        if (editColorInput && editPreviewBadge && colorHexValue) {
            editColorInput.addEventListener('input', function() {
                editPreviewBadge.style.borderColor = this.value;
                colorHexValue.textContent = this.value;
            });
        }
        
        // Mise à jour de l'icône en temps réel dans le formulaire d'édition
        if (editIconifyIdInput && editPreviewIcon) {
            editIconifyIdInput.addEventListener('change', function() {
                updateIconPreview(this.value, editPreviewIcon);
            });
        }
    }
    
    /**
     * Met à jour l'aperçu d'une icône
     * @param {string} iconValue - Valeur de l'icône (iconify_id)
     * @param {HTMLElement} previewElement - Élément d'aperçu
     */
    function updateIconPreview(iconValue, previewElement) {
        if (!previewElement) return;
        
        if (iconValue) {
            previewElement.innerHTML = `<span class="iconify" data-icon="${iconValue}"></span>`;
        } else {
            previewElement.innerHTML = `<i class="fas fa-folder"></i>`;
        }
        
        refreshIconify();
    }
    
    /**
     * Rafraîchit les icônes Iconify sur la page
     */
    function refreshIconify() {
        if (window.Iconify) {
            window.Iconify.scan();
        }
    }
    
    /**
     * Trie un tableau par colonne
     * @param {HTMLElement} table - Le tableau à trier
     * @param {number} columnIndex - L'index de la colonne à trier
     */
    function sortTable(table, columnIndex) {
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        const thList = thead.querySelectorAll('th');
        
        if (!tbody || !thead) return;
        
        // Déterminer la direction du tri
        const th = thList[columnIndex];
        const sortIcon = th.querySelector('.sort-icon');
        let sortDirection = 'asc';
        
        if (sortIcon.classList.contains('asc')) {
            sortDirection = 'desc';
            sortIcon.classList.remove('asc');
            sortIcon.classList.add('desc');
        } else {
            sortIcon.classList.remove('desc');
            sortIcon.classList.add('asc');
        }
        
        // Réinitialiser les autres en-têtes
        thList.forEach(header => {
            if (header !== th) {
                const icon = header.querySelector('.sort-icon');
                if (icon) {
                    icon.classList.remove('asc', 'desc');
                }
            }
        });
        
        // Déterminer le type de données de la colonne
        const dataType = th.getAttribute('data-type') || 'text';
        
        // Trier les lignes
        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort((rowA, rowB) => {
            let cellA = rowA.cells[columnIndex];
            let cellB = rowB.cells[columnIndex];
            
            if (!cellA || !cellB) return 0;
            
            // Récupérer les valeurs à comparer
            let valueA = cellA.dataset.sortValue || cellA.textContent.trim();
            let valueB = cellB.dataset.sortValue || cellB.textContent.trim();
            
            // Comparer selon le type de données
            let comparison = 0;
            
            if (dataType === 'number') {
                // Convertir en nombres et comparer
                const numA = parseFloat(valueA.replace(/[^\d.-]/g, '')) || 0;
                const numB = parseFloat(valueB.replace(/[^\d.-]/g, '')) || 0;
                comparison = numA - numB;
            } else if (dataType === 'date') {
                // Convertir en dates et comparer
                const dateA = parseDate(valueA);
                const dateB = parseDate(valueB);
                comparison = dateA - dateB;
            } else {
                // Comparer comme du texte
                comparison = valueA.localeCompare(valueB, 'fr', { sensitivity: 'base' });
            }
            
            // Inverser si tri descendant
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        
        // Replacer les lignes dans l'ordre trié
        rows.forEach(row => {
            tbody.appendChild(row);
        });
    }
    
    /**
     * Convertit une chaîne de date en timestamp
     * @param {string} dateStr - Date au format DD/MM/YYYY
     * @returns {number} - Timestamp correspondant
     */
    function parseDate(dateStr) {
        const parts = dateStr.match(/(\d+)[/-](\d+)[/-](\d+)/);
        if (parts) {
            // Format français: jour/mois/année
            const day = parseInt(parts[1], 10);
            const month = parseInt(parts[2], 10) - 1; // Les mois sont indexés à partir de 0
            const year = parseInt(parts[3], 10);
            return new Date(year, month, day).getTime();
        }
        return 0;
    }
})();