// app/static/js/tricount/flag_management.js

/**
 * Module pour gérer les types de dépenses (flags) dans l'interface Tricount
 * Gère les modales d'édition/suppression et la prévisualisation dynamique
 */
(function() {
    // Variables principales
    let deleteModal = null;
    let editModal = null;
    
    // Initialisation au chargement de la page
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Initializing flag management...");
        
        // Initialiser les composants principaux
        initDeleteModal();
        initEditModal();
        initPreviewFunctionality();
        
        // Initialiser les tooltips
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
        
        // Activer le tri de table
        if (window.TableSorter && typeof window.TableSorter.init === 'function') {
            window.TableSorter.init();
        }
    });

    /**
     * Initialise la modal de suppression
     */
    function initDeleteModal() {
        const deleteModalElement = document.getElementById('deleteFlagModal');
        if (!deleteModalElement) return;
        
        deleteModal = new bootstrap.Modal(deleteModalElement);
        const deleteButtons = document.querySelectorAll('.delete-flag');
        const deleteFlagName = document.getElementById('delete-flag-name');
        const deleteFlagCount = document.getElementById('delete-flag-count');
        const deleteFlagWarning = document.getElementById('delete-flag-warning');
        const deleteFlagForm = document.getElementById('delete-flag-form');
        const deleteFlagSubmit = document.getElementById('delete-flag-submit');
        
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const flagId = this.dataset.id;
                const flagName = this.dataset.name;
                const flagCount = parseInt(this.dataset.count);
                
                deleteFlagName.textContent = flagName;
                
                // Afficher ou masquer l'avertissement si le flag est utilisé
                if (flagCount > 0) {
                    deleteFlagCount.textContent = flagCount;
                    deleteFlagWarning.classList.remove('d-none');
                    deleteFlagSubmit.disabled = true;
                } else {
                    deleteFlagWarning.classList.add('d-none');
                    deleteFlagSubmit.disabled = false;
                }
                
                deleteFlagForm.action = window.flagDeleteUrl.replace('0', flagId);
                
                deleteModal.show();
            });
        });
    }
    
    /**
     * Initialise la modal d'édition
     */
    function initEditModal() {
        const editModalElement = document.getElementById('editFlagModal');
        if (!editModalElement) return;
        
        editModal = new bootstrap.Modal(editModalElement);
        const editButtons = document.querySelectorAll('.edit-flag');
        const editFlagForm = document.getElementById('edit-flag-form');
        const editNameInput = document.getElementById('edit-name');
        const editDescriptionInput = document.getElementById('edit-description');
        const editColorInput = document.getElementById('edit-color');
        const editIconifyInput = document.getElementById('edit-iconify-id');
        const editIsDefaultCheckbox = document.getElementById('edit-is-default');
        const saveFlagButton = document.getElementById('save-flag');
        
        // Gérer le clic sur les boutons d'édition
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const flagId = this.dataset.id;
                const flagName = this.dataset.name;
                const flagDescription = this.dataset.description || '';
                const flagColor = this.dataset.color;
                const flagIconifyId = this.dataset.iconifyId || '';
                const flagIsDefault = this.dataset.isDefault === 'true';
                
                console.log("Edit button clicked for:", flagName);
                console.log("Iconify ID:", flagIconifyId);
                console.log("Color:", flagColor);
                
                // Remplir le formulaire
                if (editNameInput) editNameInput.value = flagName;
                if (editDescriptionInput) editDescriptionInput.value = flagDescription;
                if (editColorInput) editColorInput.value = flagColor;
                if (editIconifyInput) editIconifyInput.value = flagIconifyId;
                if (editIsDefaultCheckbox) editIsDefaultCheckbox.checked = flagIsDefault;
                
                // Définir l'URL de soumission
                if (editFlagForm && window.flagUpdateUrl) {
                    editFlagForm.action = window.flagUpdateUrl.replace('0', flagId);
                }
                
                // Ouvrir la modal
                editModal.show();
                
                // Mettre à jour l'aperçu après que le modal soit affiché
                editModalElement.addEventListener('shown.bs.modal', function onceModalShown() {
                    // Supprimer cet écouteur après son exécution
                    editModalElement.removeEventListener('shown.bs.modal', onceModalShown);
                    
                    // Mettre à jour l'aperçu du badge
                    updateFlagPreview(
                        'edit-flag-preview-badge',
                        flagName, 
                        flagColor, 
                        flagIconifyId
                    );
                    
                    // Mettre à jour la valeur hexadécimale
                    const colorHexValue = document.getElementById('color-hex-value');
                    if (colorHexValue) {
                        colorHexValue.textContent = flagColor;
                    }
                    
                    // Rafraîchir Iconify
                    refreshIconify();
                });
            });
        });
        
        // Soumettre le formulaire lors du clic sur Enregistrer
        if (saveFlagButton) {
            saveFlagButton.addEventListener('click', function() {
                if (editFlagForm) {
                    editFlagForm.submit();
                }
            });
        }
        
        // Écouteurs d'événements pour le formulaire d'édition
        if (editNameInput) {
            editNameInput.addEventListener('input', function() {
                updatePreviewName('edit-flag-preview-badge', this.value);
            });
        }
        
        if (editColorInput) {
            editColorInput.addEventListener('input', function() {
                updatePreviewColor('edit-flag-preview-badge', this.value);
                
                // Mettre à jour la valeur hexadécimale
                const colorHexValue = document.getElementById('color-hex-value');
                if (colorHexValue) {
                    colorHexValue.textContent = this.value;
                }
            });
        }
        
        if (editIconifyInput) {
            editIconifyInput.addEventListener('change', function() {
                updatePreviewIcon('edit-flag-preview-badge', this.value);
            });
        }
    }
    
    /**
     * Initialise les fonctionnalités d'aperçu pour le formulaire d'ajout
     */
    function initPreviewFunctionality() {
        // Éléments du formulaire d'ajout
        const nameInput = document.getElementById('name');
        const colorInput = document.getElementById('color');
        const iconifyInput = document.getElementById('iconify_id');
        
        // Aperçu du formulaire d'ajout
        const previewBadge = document.getElementById('flag-preview-badge');
        
        // Mise à jour du nom en temps réel
        if (nameInput && previewBadge) {
            nameInput.addEventListener('input', function() {
                updatePreviewName('flag-preview-badge', this.value);
            });
        }
        
        // Mise à jour de la couleur en temps réel
        if (colorInput && previewBadge) {
            colorInput.addEventListener('input', function() {
                updatePreviewColor('flag-preview-badge', this.value);
            });
        }
        
        // Mise à jour de l'icône en temps réel
        if (iconifyInput && previewBadge) {
            iconifyInput.addEventListener('change', function() {
                updatePreviewIcon('flag-preview-badge', this.value);
            });
        }
    }
    
    /**
     * Met à jour l'aperçu complet d'un badge de flag
     * @param {string} badgeId - ID du badge à mettre à jour
     * @param {string} name - Nouveau nom
     * @param {string} color - Nouvelle couleur
     * @param {string} iconifyId - Nouvel ID d'icône
     */
    function updateFlagPreview(badgeId, name, color, iconifyId) {
        updatePreviewName(badgeId, name);
        updatePreviewColor(badgeId, color);
        updatePreviewIcon(badgeId, iconifyId);
    }
    
    /**
     * Met à jour le nom dans le badge d'aperçu
     * @param {string} badgeId - ID du badge à mettre à jour
     * @param {string} name - Nouveau nom
     */
    function updatePreviewName(badgeId, name) {
        const previewBadge = document.getElementById(badgeId);
        if (!previewBadge) return;
        
        // Chercher un nœud de texte ou un élément span contenant le nom
        let textNode = null;
        for (let i = previewBadge.childNodes.length - 1; i >= 0; i--) {
            const node = previewBadge.childNodes[i];
            if (node.nodeType === Node.TEXT_NODE) {
                textNode = node;
                break;
            }
        }
        
        if (textNode) {
            textNode.nodeValue = name || 'Nom du type';
        } else {
            // Si aucun nœud de texte trouvé, chercher un span
            const textSpan = previewBadge.querySelector('span:not(.iconify):not(.emoji)');
            if (textSpan) {
                textSpan.textContent = name || 'Nom du type';
            } else {
                // En dernier recours, récupérer l'icône et reconstruire
                const iconElement = previewBadge.querySelector('.iconify, .fas, .emoji');
                if (iconElement) {
                    const iconHTML = iconElement.outerHTML;
                    previewBadge.innerHTML = iconHTML + ' ' + (name || 'Nom du type');
                } else {
                    previewBadge.textContent = name || 'Nom du type';
                }
            }
        }
    }
    
    /**
     * Met à jour la couleur dans le badge d'aperçu
     * @param {string} badgeId - ID du badge à mettre à jour
     * @param {string} color - Nouvelle couleur
     */
    function updatePreviewColor(badgeId, color) {
        const previewBadge = document.getElementById(badgeId);
        if (!previewBadge) return;
        
        previewBadge.style.backgroundColor = color;
    }
    
    /**
     * Met à jour l'icône dans le badge d'aperçu
     * @param {string} badgeId - ID du badge à mettre à jour
     * @param {string} iconifyId - Nouvel ID d'icône
     */
    function updatePreviewIcon(badgeId, iconifyId) {
        if (!iconifyId) return;
        
        const previewBadge = document.getElementById(badgeId);
        if (!previewBadge) return;
        
        // Vérifier si une icône existe déjà
        const existingIcon = previewBadge.querySelector('.iconify, .fas, .emoji');
        
        if (existingIcon) {
            // Si c'est une icône Iconify, mettre à jour l'attribut data-icon
            if (existingIcon.classList.contains('iconify')) {
                existingIcon.setAttribute('data-icon', iconifyId);
            } else {
                // Si c'est une autre type d'icône, remplacer par une icône Iconify
                const iconHTML = `<span class="iconify me-2" data-icon="${iconifyId}"></span>`;
                existingIcon.outerHTML = iconHTML;
            }
        } else {
            // Si aucune icône n'existe, ajouter une nouvelle icône Iconify au début
            const iconHTML = `<span class="iconify me-2" data-icon="${iconifyId}"></span>`;
            previewBadge.innerHTML = iconHTML + previewBadge.innerHTML;
        }
        
        // Rafraîchir Iconify
        refreshIconify();
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