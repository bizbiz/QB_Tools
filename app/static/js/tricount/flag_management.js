// app/static/js/tricount/flag_management.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // === GESTION DES SÉLECTEURS D'ICÔNES ===
    const iconSelector = document.getElementById('icon_id');
    const legacyIconSelector = document.getElementById('legacy_icon');
    const iconPreview = document.getElementById('icon-preview');
    
    // Sélecteurs pour la modal d'édition
    const editIconSelector = document.getElementById('edit-icon-id');
    const editLegacyIconSelector = document.getElementById('edit-legacy-icon');
    const editIconPreview = document.getElementById('edit-icon-preview');
    
    // Fonction pour mettre à jour l'aperçu de l'icône
    function updateIconPreview(iconId, legacyIcon, previewElement) {
        if (!previewElement) return;

        let previewHTML = '<div class="d-flex align-items-center">';
        
        // Si une icône personnalisée est sélectionnée
        if (iconId && window.iconsData && window.iconsData[iconId]) {
            const iconData = window.iconsData[iconId];
            previewHTML += `
                <div class="me-3 p-3 border rounded">
                    <span style="font-size: 2rem;">${iconData.emoji}</span>
                </div>
                <div class="text-muted">
                    <p class="mb-1"><strong>Icône sélectionnée:</strong> ${iconData.name}</p>
                </div>
            `;
        } 
        // Sinon, si une icône Font Awesome est sélectionnée
        else if (legacyIcon) {
            previewHTML += `
                <div class="me-3 p-3 border rounded">
                    <i class="fas ${legacyIcon} fa-2x"></i>
                </div>
                <div class="text-muted">
                    <p class="mb-1"><strong>Icône Font Awesome:</strong> ${legacyIcon}</p>
                </div>
            `;
        } 
        // Si rien n'est sélectionné
        else {
            previewHTML += `
                <div class="alert alert-info mb-0">
                    Sélectionnez une icône personnalisée ou Font Awesome pour l'aperçu.
                </div>
            `;
        }
        
        previewHTML += '</div>';
        previewElement.innerHTML = previewHTML;
    }
    
    // Mettre à jour l'aperçu quand le sélecteur d'icône personnalisée change
    if (iconSelector) {
        iconSelector.addEventListener('change', function() {
            // Effacer la sélection Font Awesome si une icône personnalisée est sélectionnée
            if (this.value && legacyIconSelector) {
                legacyIconSelector.value = '';
            }
            updateIconPreview(this.value, legacyIconSelector ? legacyIconSelector.value : '', iconPreview);
            updatePreviewBadge();
        });
    }
    
    // Mettre à jour l'aperçu quand le sélecteur d'icône Font Awesome change
    if (legacyIconSelector) {
        legacyIconSelector.addEventListener('change', function() {
            // Effacer la sélection d'icône personnalisée si une icône Font Awesome est sélectionnée
            if (this.value && iconSelector) {
                iconSelector.value = '';
            }
            updateIconPreview('', this.value, iconPreview);
            updatePreviewBadge();
        });
    }
    
    // Idem pour les sélecteurs dans la modal d'édition
    if (editIconSelector) {
        editIconSelector.addEventListener('change', function() {
            if (this.value && editLegacyIconSelector) {
                editLegacyIconSelector.value = '';
            }
            updateIconPreview(this.value, editLegacyIconSelector ? editLegacyIconSelector.value : '', editIconPreview);
            updatePreviewBadge();
        });
    }
    
    if (editLegacyIconSelector) {
        editLegacyIconSelector.addEventListener('change', function() {
            if (this.value && editIconSelector) {
                editIconSelector.value = '';
            }
            updateIconPreview('', this.value, editIconPreview);
            updatePreviewBadge();
        });
    }
    
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
    const editFlagForm = document.getElementById('edit-flag-form');
    const editNameInput = document.getElementById('edit-name');
    const editDescriptionInput = document.getElementById('edit-description');
    const editColorInput = document.getElementById('edit-color');
    const editIsDefaultCheckbox = document.getElementById('edit-is-default');
    const saveFlagButton = document.getElementById('save-flag');
    
    // Éléments de prévisualisation
    const previewName = document.getElementById('preview-name');
    const previewIcon = document.getElementById('preview-icon');
    const previewEmoji = document.getElementById('preview-emoji');
    const previewBadge = document.querySelector('.preview-badge');
    const colorHexValue = document.getElementById('color-hex-value');
    
    // Mise à jour en temps réel de la prévisualisation
    editNameInput.addEventListener('input', updatePreviewBadge);
    editColorInput.addEventListener('input', updatePreviewBadge);
    
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
        
        // Mettre à jour l'icône en fonction de la sélection
        if (previewIcon && previewEmoji) {
            const selectedIconId = editIconSelector ? editIconSelector.value : '';
            const selectedLegacyIcon = editLegacyIconSelector ? editLegacyIconSelector.value : '';
            
            if (selectedIconId && window.iconsData && window.iconsData[selectedIconId]) {
                // Utiliser l'emoji de l'icône personnalisée
                previewEmoji.textContent = window.iconsData[selectedIconId].emoji;
                previewEmoji.style.display = 'inline';
                previewIcon.style.display = 'none';
            } else if (selectedLegacyIcon) {
                // Utiliser l'icône Font Awesome
                previewIcon.className = 'fas ' + selectedLegacyIcon;
                previewIcon.style.display = 'inline';
                previewEmoji.style.display = 'none';
            } else {
                // Icône par défaut
                previewIcon.className = 'fas fa-tag';
                previewIcon.style.display = 'inline';
                previewEmoji.style.display = 'none';
            }
        }
    }
    
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const flagId = this.dataset.id;
            const flagName = this.dataset.name;
            const flagDescription = this.dataset.description;
            const flagColor = this.dataset.color;
            const flagIconId = this.dataset.iconId;
            const flagLegacyIcon = this.dataset.legacyIcon;
            const flagIsDefault = this.dataset.isDefault === 'true';
            
            // Remplir le formulaire
            editNameInput.value = flagName;
            editDescriptionInput.value = flagDescription;
            editColorInput.value = flagColor;
            
            // Sélectionner l'icône appropriée
            if (editIconSelector) {
                editIconSelector.value = flagIconId || '';
            }
            
            if (editLegacyIconSelector) {
                editLegacyIconSelector.value = flagLegacyIcon || '';
            }
            
            editIsDefaultCheckbox.checked = flagIsDefault;
            
            // Mettre à jour l'aperçu de l'icône
            updateIconPreview(
                flagIconId, 
                flagLegacyIcon, 
                editIconPreview
            );
            
            // Mettre à jour la prévisualisation
            updatePreviewBadge();
            
            // Définir l'URL de soumission
            editFlagForm.action = window.flagUpdateUrl.replace('0', flagId);
            
            // Ouvrir la modal
            editModal.show();
        });
    });
    
    // Enregistrer les modifications
    saveFlagButton.addEventListener('click', function() {
        editFlagForm.submit();
    });
    
    // Initialiser les aperçus au chargement de la page
    if (iconPreview) {
        updateIconPreview('', legacyIconSelector ? legacyIconSelector.value : '', iconPreview);
    }
    
    // Mise à jour initiale de la prévisualisation du badge
    updatePreviewBadge();
});