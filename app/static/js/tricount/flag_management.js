// app/static/js/tricount/flag_management.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // === GESTION DES SÉLECTEURS D'ICÔNES ===
    const iconSelector = document.getElementById('icon_id');
    const iconPreview = document.getElementById('icon-preview');
    
    // Sélecteurs pour la modal d'édition
    const editIconSelector = document.getElementById('edit-icon-id');
    const editIconPreview = document.getElementById('edit-icon-preview');
    
    // Fonction pour mettre à jour l'aperçu de l'icône
    function updateIconPreview(iconId, previewElement) {
        if (!previewElement) return;

        let previewHTML = '';
        
        // Si une icône personnalisée est sélectionnée
        if (iconId && window.iconsData && window.iconsData[iconId]) {
            const iconData = window.iconsData[iconId];
            previewHTML = `
                <div class="d-flex align-items-center">
                    <div class="me-3 p-3 border rounded">
                        <span style="font-size: 2rem;">${iconData.emoji}</span>
                    </div>
                    <div class="text-muted">
                        <p class="mb-1"><strong>Icône sélectionnée:</strong> ${iconData.name}</p>
                    </div>
                </div>
            `;
        } else {
            previewHTML = `
                <div class="alert alert-info mb-0">
                    Sélectionnez une icône pour afficher l'aperçu.
                </div>
            `;
        }
        
        previewElement.innerHTML = previewHTML;
    }
    
    // Mettre à jour l'aperçu quand le sélecteur d'icône change
    if (iconSelector) {
        iconSelector.addEventListener('change', function() {
            updateIconPreview(this.value, iconPreview);
            if (typeof updatePreviewBadge === 'function') {
                updatePreviewBadge();
            }
        });
    }
    
    // Idem pour le sélecteur dans la modal d'édition
    if (editIconSelector) {
        editIconSelector.addEventListener('change', function() {
            updateIconPreview(this.value, editIconPreview);
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
        if (previewEmoji) {
            const selectedIconId = editIconSelector ? editIconSelector.value : '';
            
            if (selectedIconId && window.iconsData && window.iconsData[selectedIconId]) {
                // Utiliser l'emoji de l'icône personnalisée
                previewEmoji.textContent = window.iconsData[selectedIconId].emoji;
                previewEmoji.style.display = 'inline';
            } else {
                // Icône par défaut
                previewEmoji.textContent = '🏷️';
                previewEmoji.style.display = 'inline';
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
            const flagIsDefault = this.dataset.isDefault === 'true';
            
            // Remplir le formulaire
            editNameInput.value = flagName;
            editDescriptionInput.value = flagDescription;
            editColorInput.value = flagColor;
            
            // Sélectionner l'icône
            if (editIconSelector) {
                editIconSelector.value = flagIconId || '';
            }
            
            editIsDefaultCheckbox.checked = flagIsDefault;
            
            // Mettre à jour l'aperçu de l'icône
            updateIconPreview(flagIconId, editIconPreview);
            
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
        updateIconPreview('', iconPreview);
    }
    
    // Mise à jour initiale de la prévisualisation du badge
    updatePreviewBadge();
});