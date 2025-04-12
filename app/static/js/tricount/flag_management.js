// app/static/js/tricount/flag_management.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // === GESTION DE L'APERÇU ET DES ICONES DANS LE FORMULAIRE D'AJOUT ===
    initAddFormPreview();
    
    // === GESTION DE LA MODAL DE SUPPRESSION ===
    const deleteButtons = document.querySelectorAll('.delete-flag');
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteFlagModal'));
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
    
    // === GESTION DE LA MODAL D'ÉDITION ===
    const editButtons = document.querySelectorAll('.edit-flag');
    const editModal = new bootstrap.Modal(document.getElementById('editFlagModal'));
    const editModalElement = document.getElementById('editFlagModal');
    const editFlagForm = document.getElementById('edit-flag-form');
    const editNameInput = document.getElementById('edit-name');
    const editDescriptionInput = document.getElementById('edit-description');
    const editColorInput = document.getElementById('edit-color');
    const editIconifyIdInput = document.getElementById('edit-iconify-id');
    const editIsDefaultCheckbox = document.getElementById('edit-is-default');
    const saveFlagButton = document.getElementById('save-flag');
    
    // Éléments de prévisualisation
    const previewName = document.getElementById('preview-name');
    const previewEmoji = document.getElementById('preview-emoji');
    const previewBadge = document.querySelector('.preview-badge');
    const colorHexValue = document.getElementById('color-hex-value');
    
    // Mise à jour en temps réel de la prévisualisation d'édition
    if (editNameInput) {
        editNameInput.addEventListener('input', updatePreviewBadge);
    }
    
    if (editColorInput) {
        editColorInput.addEventListener('input', updatePreviewBadge);
    }
    
    if (editIconifyIdInput) {
        editIconifyIdInput.addEventListener('input', function() {
            updateIconPreview(this.value);
            updatePreviewBadge();
        });
    }
    
    // Gérer le clic sur les boutons d'édition
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const flagId = this.dataset.id;
            const flagName = this.dataset.name;
            const flagDescription = this.dataset.description;
            const flagColor = this.dataset.color;
            const flagIconifyId = this.dataset.iconifyId;
            const flagIsDefault = this.dataset.isDefault === 'true';
            
            // Remplir le formulaire avec les données du flag
            editNameInput.value = flagName;
            editDescriptionInput.value = flagDescription;
            editColorInput.value = flagColor;
            editIconifyIdInput.value = flagIconifyId;
            editIsDefaultCheckbox.checked = flagIsDefault;
            
            // Définir l'URL de soumission
            editFlagForm.action = window.flagUpdateUrl.replace('0', flagId);
            
            // Ouvrir la modal
            editModal.show();
            
            // Attendre que la modal soit complètement affichée avant de mettre à jour l'aperçu
            editModalElement.addEventListener('shown.bs.modal', function() {
                // Mettre à jour l'aperçu
                updatePreviewBadge();
                updateIconPreview(flagIconifyId);
                
                // Actualiser les icônes Iconify
                if (window.Iconify) {
                    window.Iconify.scan();
                }
            }, { once: true });
        });
    });
    
    // Fonction pour mettre à jour la prévisualisation du badge
    function updatePreviewBadge() {
        // Mettre à jour le nom
        if (previewName) {
            previewName.textContent = editNameInput ? editNameInput.value || 'Nom du type' : 'Nom du type';
        }
        
        // Mettre à jour la couleur
        if (previewBadge && editColorInput) {
            previewBadge.style.backgroundColor = editColorInput.value;
        }
        
        if (colorHexValue && editColorInput) {
            colorHexValue.textContent = editColorInput.value;
        }
    }
    
    // Fonction pour mettre à jour l'aperçu de l'icône dans l'élément previw-emoji
    function updateIconPreview(iconifyId) {
        if (previewEmoji) {
            if (iconifyId) {
                // Configurer pour Iconify
                previewEmoji.innerHTML = '';
                previewEmoji.className = 'iconify me-1';
                previewEmoji.setAttribute('data-icon', iconifyId);
            } else {
                // Emoji par défaut
                previewEmoji.innerHTML = '🏷️';
                previewEmoji.className = 'me-1';
            }
            
            // Actualiser Iconify
            if (window.Iconify) {
                window.Iconify.scan();
            }
        }
    }
    
    // Enregistrer les modifications
    if (saveFlagButton) {
        saveFlagButton.addEventListener('click', function() {
            editFlagForm.submit();
        });
    }
    
    // === INITIALISATION DE L'APERÇU DU FORMULAIRE D'AJOUT ===
    function initAddFormPreview() {
        // Champs du formulaire d'ajout
        const nameInput = document.getElementById('name');
        const colorInput = document.getElementById('color');
        const iconifyIdInput = document.getElementById('iconify_id');
        
        // Éléments d'aperçu
        const flagPreview = document.getElementById('flag-preview');
        const flagIcon = document.getElementById('flag-icon');
        const flagName = document.getElementById('flag-name');
        
        // Mise à jour du nom
        if (nameInput && flagName) {
            nameInput.addEventListener('input', function() {
                flagName.textContent = this.value || 'Nouveau type';
            });
        }
        
        // Mise à jour de la couleur
        if (colorInput && flagPreview) {
            colorInput.addEventListener('input', function() {
                flagPreview.style.backgroundColor = this.value;
            });
        }
        
        // Mise à jour de l'icône
        if (iconifyIdInput && flagIcon) {
            iconifyIdInput.addEventListener('input', function() {
                if (this.value) {
                    // Remplacer l'émoji par une icône Iconify
                    flagIcon.innerHTML = '';
                    flagIcon.className = 'iconify me-1';
                    flagIcon.setAttribute('data-icon', this.value);
                    
                    // Actualiser Iconify
                    if (window.Iconify) {
                        window.Iconify.scan();
                    }
                } else {
                    // Revenir à l'émoji par défaut
                    flagIcon.innerHTML = '🏷️';
                    flagIcon.className = 'me-1';
                }
            });
        }
    }
    
    // Initialiser Iconify au chargement
    if (window.Iconify) {
        window.Iconify.scan();
    }
});