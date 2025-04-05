// app/static/js/tricount/flag_management.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
    
    // Gestion de la modal de suppression
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
    
    // Gestion de la modal d'édition
    const editButtons = document.querySelectorAll('.edit-flag');
    const editModal = new bootstrap.Modal(document.getElementById('editFlagModal'));
    const editFlagForm = document.getElementById('edit-flag-form');
    const editNameInput = document.getElementById('edit-name');
    const editDescriptionInput = document.getElementById('edit-description');
    const editColorInput = document.getElementById('edit-color');
    const editIconSelect = document.getElementById('edit-icon');
    const editIsDefaultCheckbox = document.getElementById('edit-is-default');
    const saveFlagButton = document.getElementById('save-flag');
    
    // Éléments de prévisualisation
    const previewName = document.getElementById('preview-name');
    const previewIcon = document.getElementById('preview-icon');
    const previewBadge = document.querySelector('.preview-badge');
    const colorHexValue = document.getElementById('color-hex-value');
    
    // Mise à jour en temps réel de la prévisualisation
    editNameInput.addEventListener('input', updatePreview);
    editColorInput.addEventListener('input', updatePreview);
    editIconSelect.addEventListener('change', updatePreview);
    
    function updatePreview() {
        previewName.textContent = editNameInput.value || 'Nom du type';
        previewBadge.style.backgroundColor = editColorInput.value;
        colorHexValue.textContent = editColorInput.value;
        
        // Mettre à jour l'icône
        previewIcon.className = 'fas ' + editIconSelect.value;
    }
    
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const flagId = this.dataset.id;
            const flagName = this.dataset.name;
            const flagDescription = this.dataset.description;
            const flagColor = this.dataset.color;
            const flagIcon = this.dataset.icon;
            const flagIsDefault = this.dataset.isDefault === 'true';
            
            // Remplir le formulaire
            editNameInput.value = flagName;
            editDescriptionInput.value = flagDescription;
            editColorInput.value = flagColor;
            editIconSelect.value = flagIcon;
            editIsDefaultCheckbox.checked = flagIsDefault;
            
            // Mettre à jour la prévisualisation
            updatePreview();
            
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
});