// app/static/js/tricount/flag_management.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // === GESTION DES SÉLECTEURS D'ICÔNES ===
    const iconSelector = document.getElementById('icon_id');
    
    // Sélecteurs pour la modal d'édition
    const editIconSelector = document.getElementById('edit-icon-id');
    
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
    if (editNameInput) {
        editNameInput.addEventListener('input', updatePreviewBadge);
    }
    
    if (editColorInput) {
        editColorInput.addEventListener('input', updatePreviewBadge);
    }
    
    if (editIconSelector) {
        editIconSelector.addEventListener('change', updatePreviewBadge);
    }
    
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
        
        // Mettre à jour l'émoji en fonction de la sélection d'icône
        if (previewEmoji) {
            const selectedIconId = editIconSelector ? editIconSelector.value : '';
            
            // Récupérer l'émoji depuis les données d'icône
            if (selectedIconId && window.iconsData && window.iconsData[selectedIconId]) {
                previewEmoji.textContent = window.iconsData[selectedIconId].emoji;
                previewEmoji.style.display = 'inline-block'; // Assurer que l'émoji est visible
            } else {
                // Émoji par défaut en cas d'absence d'icône
                previewEmoji.textContent = '🏷️';
                previewEmoji.style.display = 'inline-block';
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
            
            // Sélectionner l'icône si disponible
            if (editIconSelector) {
                editIconSelector.value = flagIconId || '';
            }
            
            editIsDefaultCheckbox.checked = flagIsDefault;
            
            // Mettre à jour la prévisualisation immédiatement
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
    
    // Initialiser la prévisualisation au chargement
    updatePreviewBadge();
});