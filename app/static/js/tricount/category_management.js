// app/static/js/tricount/category_management.js

/**
 * Module pour gérer les catégories dans l'interface Tricount
 * Contient les fonctions d'édition et de gestion des aperçus
 */
(function() {
    // Variables principales
    let deleteModal = null;
    let editModal = null;
    
    // Initialisation au chargement de la page
    document.addEventListener('DOMContentLoaded', function() {
        // Initialiser les composants principaux
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
        
        // Activer le tri de table via le module commun TableSorter
        if (window.TableSorter && typeof window.TableSorter.init === 'function') {
            window.TableSorter.init();
        }
    });
    
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
        
        // Éléments d'aperçu pour le formulaire d'édition
        const editPreviewBadge = document.getElementById('edit-category-preview-badge');
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
                                const flags = data.flags;
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
    }
    
    /**
     * Initialise les fonctionnalités d'aperçu en temps réel
     */
    function initPreviewFunctionality() {
        // Éléments du formulaire d'ajout
        const nameInput = document.getElementById('name');
        const colorInput = document.getElementById('color');
        const iconifyIdInput = document.getElementById('iconify_id');
        
        // Élément badge d'aperçu pour le formulaire d'ajout
        const previewBadge = document.getElementById('category-preview-badge');
        
        // Mise à jour du nom en temps réel
        if (nameInput && previewBadge) {
            nameInput.addEventListener('input', function() {
                // Trouver le dernier élément enfant (le nom) et le mettre à jour
                const lastChild = previewBadge.childNodes[previewBadge.childNodes.length - 1];
                if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
                    lastChild.nodeValue = this.value || 'Nouvelle catégorie';
                } else {
                    // Si on ne trouve pas le nœud de texte pour une raison quelconque, remplacer tout le contenu
                    const iconElement = previewBadge.querySelector('.iconify, .fas, .emoji');
                    if (iconElement) {
                        const iconHtml = iconElement.outerHTML;
                        previewBadge.innerHTML = iconHtml + ' ' + (this.value || 'Nouvelle catégorie');
                    } else {
                        previewBadge.textContent = this.value || 'Nouvelle catégorie';
                    }
                }
            });
        }
        
        // Mise à jour de la couleur en temps réel
        if (colorInput && previewBadge) {
            colorInput.addEventListener('input', function() {
                previewBadge.style.borderColor = this.value;
            });
        }
        
        // Mise à jour de l'icône en temps réel
        if (iconifyIdInput && previewBadge) {
            iconifyIdInput.addEventListener('change', function() {
                updatePreviewBadgeIcon(previewBadge, this.value);
            });
        }
        
        // Éléments du formulaire d'édition
        const editNameInput = document.getElementById('edit-name');
        const editColorInput = document.getElementById('edit-color');
        const editIconifyIdInput = document.getElementById('edit-iconify-id');
        
        // Élément badge d'aperçu pour le formulaire d'édition
        const editPreviewBadge = document.getElementById('edit-category-preview-badge');
        const colorHexValue = document.getElementById('color-hex-value');
        
        // Mise à jour du nom en temps réel dans le formulaire d'édition
        if (editNameInput && editPreviewBadge) {
            editNameInput.addEventListener('input', function() {
                // Trouver le dernier élément enfant (le nom) et le mettre à jour
                const lastChild = editPreviewBadge.childNodes[editPreviewBadge.childNodes.length - 1];
                if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
                    lastChild.nodeValue = this.value || 'Nom de la catégorie';
                } else {
                    // Si on ne trouve pas le nœud de texte pour une raison quelconque, remplacer tout le contenu
                    const iconElement = editPreviewBadge.querySelector('.iconify, .fas, .emoji');
                    if (iconElement) {
                        const iconHtml = iconElement.outerHTML;
                        editPreviewBadge.innerHTML = iconHtml + ' ' + (this.value || 'Nom de la catégorie');
                    } else {
                        editPreviewBadge.textContent = this.value || 'Nom de la catégorie';
                    }
                }
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
        if (editIconifyIdInput && editPreviewBadge) {
            editIconifyIdInput.addEventListener('change', function() {
                updatePreviewBadgeIcon(editPreviewBadge, this.value);
            });
        }
    }
    
    /**
     * Met à jour l'icône dans un badge d'aperçu
     * @param {HTMLElement} badgeElement - Élément badge à modifier
     * @param {string} iconValue - Valeur de l'icône (iconify_id)
     */
    function updatePreviewBadgeIcon(badgeElement, iconValue) {
        if (!badgeElement) return;
        
        // Trouver l'élément d'icône existant
        const existingIcon = badgeElement.querySelector('.iconify, .fas');
        
        // Créer un nouvel élément d'icône
        let iconHTML = '';
        if (iconValue) {
            iconHTML = `<span class="iconify me-2" data-icon="${iconValue}"></span>`;
        } else {
            iconHTML = `<i class="fas fa-folder me-2"></i>`;
        }
        
        // Remplacer l'icône existante ou ajouter la nouvelle
        if (existingIcon) {
            existingIcon.outerHTML = iconHTML;
        } else {
            // Si aucune icône n'existe, ajouter au début du badge
            badgeElement.innerHTML = iconHTML + badgeElement.innerHTML;
        }
        
        // Actualiser iconify
        refreshIconify();
    }
    
    /**
     * Met à jour l'aperçu dans la modal d'édition
     */
    function updateEditPreview(name, color, iconifyId, legacyIcon) {
        // Récupérer le badge d'aperçu
        const editPreviewBadge = document.getElementById('edit-category-preview-badge');
        
        if (editPreviewBadge) {
            // Mettre à jour la couleur
            editPreviewBadge.style.borderColor = color;
            
            // Mettre à jour l'icône
            if (iconifyId) {
                updatePreviewBadgeIcon(editPreviewBadge, iconifyId);
            } else if (legacyIcon) {
                const iconHTML = `<i class="fas ${legacyIcon} me-2"></i>`;
                const existingIcon = editPreviewBadge.querySelector('.iconify, .fas');
                if (existingIcon) {
                    existingIcon.outerHTML = iconHTML;
                } else {
                    editPreviewBadge.innerHTML = iconHTML + editPreviewBadge.innerHTML;
                }
            }
            
            // Mettre à jour le nom (dernier nœud de texte)
            const lastChild = editPreviewBadge.childNodes[editPreviewBadge.childNodes.length - 1];
            if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
                lastChild.nodeValue = name;
            } else {
                // Si on ne trouve pas le nœud de texte pour une raison quelconque, reconstruire le contenu
                const iconElement = editPreviewBadge.querySelector('.iconify, .fas');
                if (iconElement) {
                    const iconHtml = iconElement.outerHTML;
                    editPreviewBadge.innerHTML = iconHtml + ' ' + name;
                } else {
                    editPreviewBadge.textContent = name;
                }
            }
        }
        
        // Mise à jour de la valeur hexadécimale de la couleur
        const colorHexValue = document.getElementById('color-hex-value');
        if (colorHexValue) {
            colorHexValue.textContent = color;
        }
        
        // Mettre à jour la prévisualisation de l'icône dans le champ
        const previewElem = document.getElementById('edit-iconify-id-preview');
        if (previewElem && iconifyId) {
            previewElem.innerHTML = `<span class="iconify" data-icon="${iconifyId}" style="font-size: 1.5rem;"></span>`;
            refreshIconify();
        }
    }
    
    /**
     * Rafraîchit les icônes Iconify sur la page
     */
    function refreshIconify() {
        if (window.Iconify) {
            window.Iconify.scan();
        }
    }
})();