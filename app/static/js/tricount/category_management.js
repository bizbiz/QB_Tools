// app/static/js/tricount/category_management.js

document.addEventListener('DOMContentLoaded', function() {
    // Set up table sorting
    const categoryTable = document.querySelector('.table');
    const tableHeaders = categoryTable.querySelectorAll('th');
    
    tableHeaders.forEach((header, index) => {
        // Skip the "Actions" column
        if (!header.classList.contains('no-sort')) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                sortTable(categoryTable, index);
            });
            
            // Add sort indicator
            header.innerHTML += ' <span class="sort-icon"></span>';
        }
    });
    
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
    
    // Initialize icon and color preview for add form
    initAddFormPreview();
    
    // Modal management
    setupModalEventListeners();
});

// Initialize preview in the add form
function initAddFormPreview() {
    const nameInput = document.getElementById('name');
    const iconSelect = document.getElementById('icon_id');
    const colorInput = document.getElementById('color');
    const previewBadge = document.getElementById('category-preview-badge');
    const previewEmoji = document.getElementById('preview-emoji');
    const previewName = document.getElementById('preview-name');
    
    // Update preview when name changes
    if (nameInput && previewName) {
        nameInput.addEventListener('input', function() {
            previewName.textContent = this.value || 'Nouvelle catégorie';
        });
    }
    
    // Update preview when icon changes
    if (iconSelect && previewEmoji) {
        updateIconPreview(iconSelect, previewEmoji);
        
        iconSelect.addEventListener('change', function() {
            updateIconPreview(iconSelect, previewEmoji);
        });
    }
    
    // Update preview when color changes
    if (colorInput && previewBadge) {
        colorInput.addEventListener('input', function() {
            previewBadge.style.borderColor = this.value;
        });
    }
    
    // Also initialize the edit form preview
    const editNameInput = document.getElementById('edit-name');
    const editIconSelect = document.getElementById('edit-icon-id');
    const editColorInput = document.getElementById('edit-color');
    const editPreviewBadge = document.getElementById('edit-category-preview-badge');
    const editPreviewEmoji = document.getElementById('edit-preview-emoji');
    const editPreviewName = document.getElementById('edit-preview-name');
    const colorHexValue = document.getElementById('color-hex-value');
    
    // Update preview when values change in edit modal
    if (editNameInput && editPreviewName) {
        editNameInput.addEventListener('input', function() {
            editPreviewName.textContent = this.value || 'Nom de la catégorie';
        });
    }
    
    if (editIconSelect && editPreviewEmoji) {
        editIconSelect.addEventListener('change', function() {
            updateIconPreview(editIconSelect, editPreviewEmoji);
        });
    }
    
    if (editColorInput && editPreviewBadge && colorHexValue) {
        editColorInput.addEventListener('input', function() {
            editPreviewBadge.style.borderColor = this.value;
            colorHexValue.textContent = this.value;
        });
    }
}

// Update icon preview based on selected option
function updateIconPreview(select, previewElement) {
    if (!previewElement) return;
    
    if (!select || select.selectedIndex <= 0) {
        previewElement.textContent = '📁'; // Default folder emoji
        return;
    }
    
    const selectedOption = select.options[select.selectedIndex];
    const emoji = selectedOption.getAttribute('data-emoji');
    const faClass = selectedOption.getAttribute('data-fa');
    
    if (emoji) {
        previewElement.textContent = emoji;
    } else if (faClass) {
        previewElement.innerHTML = `<i class="fas ${faClass}"></i>`;
    } else {
        previewElement.textContent = '📁'; // Default folder emoji
    }
}

// Function to sort table
function sortTable(table, columnIndex) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const headers = table.querySelectorAll('th');
    
    // Determine current sort direction
    const header = headers[columnIndex];
    const sortIcon = header.querySelector('.sort-icon');
    
    let sortDirection = 'asc';
    if (sortIcon.classList.contains('asc')) {
        sortDirection = 'desc';
        sortIcon.classList.remove('asc');
        sortIcon.classList.add('desc');
    } else {
        sortIcon.classList.remove('desc');
        sortIcon.classList.add('asc');
    }
    
    // Reset other headers
    headers.forEach(h => {
        if (h !== header) {
            const icon = h.querySelector('.sort-icon');
            if (icon) {
                icon.classList.remove('asc', 'desc');
            }
        }
    });
    
    // Sort the rows
    rows.sort((a, b) => {
        let aValue = a.cells[columnIndex].textContent.trim();
        let bValue = b.cells[columnIndex].textContent.trim();
        
        // Check for data-sort-value attribute which helps with category badges
        if (a.cells[columnIndex].dataset.sortValue) {
            aValue = a.cells[columnIndex].dataset.sortValue;
        }
        if (b.cells[columnIndex].dataset.sortValue) {
            bValue = b.cells[columnIndex].dataset.sortValue;
        }
        
        // Special case for icon column
        if (header.dataset.type === 'icon') {
            // Sort based on presence of icon
            aValue = a.cells[columnIndex].querySelector('.fas') || a.cells[columnIndex].textContent.trim() !== '—' ? 1 : 0;
            bValue = b.cells[columnIndex].querySelector('.fas') || b.cells[columnIndex].textContent.trim() !== '—' ? 1 : 0;
        }
        // Special case for flag columns (check/x mark)
        else if (a.cells[columnIndex].querySelector('.fa-check') || a.cells[columnIndex].querySelector('.fa-times')) {
            aValue = a.cells[columnIndex].querySelector('.fa-check') ? 1 : 0;
            bValue = b.cells[columnIndex].querySelector('.fa-check') ? 1 : 0;
        }
        // Handle date format (DD/MM/YYYY)
        else if (header.dataset.type === 'date') {
            aValue = parseDateString(aValue);
            bValue = parseDateString(bValue);
        }
        
        // Compare the values
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    // Re-append rows in the new order
    rows.forEach(row => tbody.appendChild(row));
}

// Parse date string in format DD/MM/YYYY
function parseDateString(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        // Convert to YYYY-MM-DD for proper comparison
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Gestion de la modal de suppression
    const deleteButtons = document.querySelectorAll('.delete-category');
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteCategoryModal'));
    const deleteCategoryName = document.getElementById('delete-category-name');
    const deleteCategoryForm = document.getElementById('delete-category-form');
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const categoryId = this.dataset.id;
            const categoryName = this.dataset.name;
            
            deleteCategoryName.textContent = categoryName;
            deleteCategoryForm.action = window.categoryDeleteUrl.replace('0', categoryId);
            
            deleteModal.show();
        });
    });
    
    // Gestion de la modal d'édition
    const editButtons = document.querySelectorAll('.edit-category');
    const editModal = new bootstrap.Modal(document.getElementById('editCategoryModal'));
    const editCategoryForm = document.getElementById('edit-category-form');
    const editNameInput = document.getElementById('edit-name');
    const editDescriptionInput = document.getElementById('edit-description');
    const editColorInput = document.getElementById('edit-color');
    const editIconSelect = document.getElementById('edit-icon-id');
    const colorHexValue = document.getElementById('color-hex-value');
    const editPreviewBadge = document.getElementById('edit-category-preview-badge');
    const editPreviewEmoji = document.getElementById('edit-preview-emoji');
    const editPreviewName = document.getElementById('edit-preview-name');
    const saveCategoryButton = document.getElementById('save-category');

    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const categoryId = this.dataset.id;
            const categoryName = this.dataset.name;
            const categoryDescription = this.dataset.description;
            const categoryIconId = this.dataset.iconId || '';
            const categoryIconEmoji = this.dataset.iconEmoji || '';
            const categoryLegacyIcon = this.dataset.legacyIcon || '';
            const categoryColor = this.dataset.color || '#e9ecef';
            
            // Remplir le formulaire
            editNameInput.value = categoryName;
            editDescriptionInput.value = categoryDescription;
            editColorInput.value = categoryColor;
            
            // Mettre à jour l'aperçu hexadécimal de la couleur
            if (colorHexValue) {
                colorHexValue.textContent = categoryColor;
            }
            
            // Mettre à jour la prévisualisation du badge
            if (editPreviewBadge) {
                editPreviewBadge.style.borderColor = categoryColor;
            }
            
            if (editPreviewName) {
                editPreviewName.textContent = categoryName;
            }
            
            // Sélectionner l'icône correspondante
            if (editIconSelect) {
                editIconSelect.value = categoryIconId;
                updateIconPreview(editIconSelect, editPreviewEmoji);
            }
            
            // Récupérer les flags de cette catégorie
            const row = this.closest('tr');
            const flagCheckboxes = document.querySelectorAll('.edit-flag-checkbox');
            
            // Réinitialiser toutes les cases à cocher
            flagCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Vérifier quels flags sont actifs pour cette catégorie
            // Nous commençons à l'index 4 pour sauter les colonnes: icône, nom, description, date
            const flagCells = Array.from(row.querySelectorAll('td')).slice(4, 4 + flagCheckboxes.length);
            
            flagCells.forEach((cell, index) => {
                const hasFlag = cell.querySelector('.fa-check') !== null;
                if (hasFlag && flagCheckboxes[index]) {
                    flagCheckboxes[index].checked = true;
                }
            });
            
            // Définir l'URL de soumission
            editCategoryForm.action = window.categoryUpdateUrl.replace('0', categoryId);
            
            // Ouvrir la modal
            editModal.show();
        });
    });
    
    saveCategoryButton.addEventListener('click', function() {
        editCategoryForm.submit();
    });
}