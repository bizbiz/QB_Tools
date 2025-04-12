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
        console.log("Initializing category management...");
        
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
        
        // Gérer le clic sur les boutons d'édition
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.dataset.id;
                const categoryName = this.dataset.name;
                const categoryDescription = this.dataset.description || '';
                const categoryIconifyId = this.dataset.iconifyId || '';
                const categoryLegacyIcon = this.dataset.legacyIcon || '';
                const categoryColor = this.dataset.color || '#e9ecef';
                
                console.log("Edit button clicked for:", categoryName);
                console.log("Icon ID:", categoryIconifyId);
                console.log("Color:", categoryColor);
                
                // Éléments du formulaire d'édition - récupérer dynamiquement
                const editNameInput = document.getElementById('edit-name');
                const editDescriptionInput = document.getElementById('edit-description');
                const editColorInput = document.getElementById('edit-color');
                const editIconifyInput = document.getElementById('edit-iconify-id');
                
                // Remplir le formulaire avec les données de la catégorie
                if (editNameInput) editNameInput.value = categoryName;
                if (editDescriptionInput) editDescriptionInput.value = categoryDescription;
                if (editColorInput) editColorInput.value = categoryColor;
                if (editIconifyInput) editIconifyInput.value = categoryIconifyId;
                
                // Ouvrir la modal
                editModal.show();
                
                // Mettre à jour l'aperçu après que le modal soit affiché
                editModalElement.addEventListener('shown.bs.modal', function onceModalShown() {
                    // Supprimer cet écouteur après son exécution (ne s'exécute qu'une fois)
                    editModalElement.removeEventListener('shown.bs.modal', onceModalShown);
                    
                    console.log("Modal shown, updating preview...");
                    
                    // Attendre un peu que le DOM soit complètement rendu
                    setTimeout(function() {
                        // Stratégie multiple pour trouver le badge d'aperçu
                        let editPreviewBadge = null;
                        
                        // Méthode 1: Par ID direct
                        editPreviewBadge = document.getElementById('edit-category-preview-badge');
                        
                        // Méthode 2: Chercher via le conteneur d'aperçu
                        if (!editPreviewBadge) {
                            console.log("Badge not found by ID, trying container...");
                            const previewContainer = document.getElementById('edit-preview-container');
                            if (previewContainer) {
                                console.log("Found preview container:", previewContainer);
                                editPreviewBadge = previewContainer.querySelector('.category-badge');
                            }
                        }
                        
                        // Méthode 3: Chercher dans le modal actuel
                        if (!editPreviewBadge) {
                            console.log("Badge not found in container, trying modal...");
                            editPreviewBadge = editModalElement.querySelector('.preview-badge');
                        }
                        
                        if (editPreviewBadge) {
                            console.log("Found preview badge:", editPreviewBadge);
                            // Mettre à jour la couleur de la bordure
                            editPreviewBadge.style.borderColor = categoryColor;
                            
                            // Trouver le nœud de texte pour le nom
                            updateCategoryText(editPreviewBadge, categoryName);
                            
                            // Mise à jour de l'icône
                            if (categoryIconifyId) {
                                const iconElement = editPreviewBadge.querySelector('.iconify');
                                if (iconElement) {
                                    console.log("Updating iconify element:", iconElement);
                                    iconElement.setAttribute('data-icon', categoryIconifyId);
                                } else {
                                    console.log("No iconify element found, creating one");
                                    // S'il n'y a pas d'élément iconify, réinitialiser le contenu
                                    editPreviewBadge.innerHTML = `
                                        <span class="iconify me-2" data-icon="${categoryIconifyId}"></span>
                                        ${categoryName}
                                    `;
                                }
                            } else if (categoryLegacyIcon) {
                                const iconElement = editPreviewBadge.querySelector('.fas');
                                if (iconElement) {
                                    console.log("Updating font awesome element:", iconElement);
                                    // Mettre à jour la classe de l'icône Font Awesome
                                    iconElement.className = `fas ${categoryLegacyIcon} me-2`;
                                } else {
                                    console.log("No font awesome element found, creating one");
                                    // S'il n'y a pas d'élément Font Awesome, réinitialiser le contenu
                                    editPreviewBadge.innerHTML = `
                                        <i class="fas ${categoryLegacyIcon} me-2"></i>
                                        ${categoryName}
                                    `;
                                }
                            }
                            
                            // Mise à jour de la valeur hexadécimale de la couleur
                            const colorHexValue = document.getElementById('color-hex-value');
                            if (colorHexValue) {
                                colorHexValue.textContent = categoryColor;
                            }
                            
                            // Actualiser les icônes Iconify
                            refreshIconify();
                        } else {
                            console.warn("Preview badge not found with any method!");
                        }
                    }, 250); // Délai plus long pour s'assurer que le DOM est prêt
                });

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
        
        // ===== Écouteurs d'événements pour le modal d'édition =====
        
        // Mise à jour du nom en temps réel
        const editNameInput = document.getElementById('edit-name');
        if (editNameInput) {
            editNameInput.addEventListener('input', function() {
                console.log("Edit name input changed:", this.value);
                const editPreviewBadge = document.getElementById('edit-category-preview-badge');
                if (editPreviewBadge) {
                    updateCategoryText(editPreviewBadge, this.value || 'Nom de la catégorie');
                }
            });
        }
        
        // Mise à jour de la couleur en temps réel
        const editColorInput = document.getElementById('edit-color');
        if (editColorInput) {
            editColorInput.addEventListener('input', function() {
                console.log("Edit color input changed:", this.value);
                // Badge d'aperçu
                const editPreviewBadge = document.getElementById('edit-category-preview-badge');
                if (editPreviewBadge) {
                    editPreviewBadge.style.borderColor = this.value;
                }
                
                // Affichage de la valeur hex
                const colorHexValue = document.getElementById('color-hex-value');
                if (colorHexValue) {
                    colorHexValue.textContent = this.value;
                }
            });
        }
    }
    
    /**
     * Met à jour le texte d'un badge de catégorie
     * @param {HTMLElement} badge - Le badge à mettre à jour
     * @param {string} newText - Le nouveau texte à afficher
     */
    function updateCategoryText(badge, newText) {
        if (!badge) return;
        
        // D'abord, chercher un nœud de texte
        let textNode = null;
        for (let i = badge.childNodes.length - 1; i >= 0; i--) {
            const node = badge.childNodes[i];
            if (node.nodeType === Node.TEXT_NODE) {
                textNode = node;
                break;
            }
        }
        
        if (textNode) {
            console.log("Found text node, updating...");
            textNode.nodeValue = newText;
        } else {
            console.log("No text node found, trying children...");
            // Chercher un élément span qui pourrait contenir le texte
            const textSpan = badge.querySelector('span:not(.iconify):not(.emoji)');
            if (textSpan) {
                console.log("Found text span, updating...");
                textSpan.textContent = newText;
            } else {
                // En dernier recours, récupérer l'élément d'icône et reconstruire
                console.log("Rebuilding badge content...");
                const iconElement = badge.querySelector('.iconify, .fas, .emoji');
                if (iconElement) {
                    const iconHTML = iconElement.outerHTML;
                    badge.innerHTML = iconHTML + ' ' + newText;
                } else {
                    badge.textContent = newText;
                }
            }
        }
    }
    
    /**
     * Initialise les fonctionnalités d'aperçu en temps réel pour le formulaire d'ajout
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
                updateCategoryText(previewBadge, this.value || 'Nouvelle catégorie');
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
                if (this.value) {
                    console.log("Iconify input changed:", this.value);
                    const iconElement = previewBadge.querySelector('.iconify');
                    if (iconElement) {
                        console.log("Updating existing iconify element");
                        iconElement.setAttribute('data-icon', this.value);
                    } else {
                        console.log("No iconify element found, rebuilding");
                        // Reconstruire avec la nouvelle icône
                        const badgeText = previewBadge.textContent.trim();
                        previewBadge.innerHTML = `
                            <span class="iconify me-2" data-icon="${this.value}"></span>
                            ${badgeText}
                        `;
                    }
                    
                    // Rafraîchir Iconify
                    refreshIconify();
                }
            });
        }
    }
    
    /**
     * Rafraîchit les icônes Iconify sur la page
     */
    function refreshIconify() {
        if (window.Iconify) {
            console.log("Refreshing Iconify...");
            window.Iconify.scan();
        }
    }
})();