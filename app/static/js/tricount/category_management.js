// app/static/js/tricount/category_management.js

document.addEventListener('DOMContentLoaded', function() {
    // Set up table sorting
    const categoryTable = document.querySelector('.table');
    const tableHeaders = categoryTable.querySelectorAll('th');
    
    tableHeaders.forEach((header, index) => {
        // Skip the "Actions" column
        if (header.textContent.trim() !== 'Actions') {
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
    
    // Modal management
    setupModalEventListeners();
});

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
        
        // Handle date format (DD/MM/YYYY)
        if (headers[columnIndex].textContent.includes('Date')) {
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
    const editForMeCheckbox = document.getElementById('edit-for-me');
    const editTricountCheckbox = document.getElementById('edit-tricount');
    const editProfessionalCheckbox = document.getElementById('edit-professional');
    const saveCategoryButton = document.getElementById('save-category');
    
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const categoryId = this.dataset.id;
            const categoryName = this.dataset.name;
            const categoryDescription = this.dataset.description;
            const categoryForMe = this.dataset.forMe === 'true';
            const categoryTricount = this.dataset.tricount === 'true';
            const categoryProfessional = this.dataset.professional === 'true';
            
            editNameInput.value = categoryName;
            editDescriptionInput.value = categoryDescription;
            editForMeCheckbox.checked = categoryForMe;
            editTricountCheckbox.checked = categoryTricount;
            editProfessionalCheckbox.checked = categoryProfessional;
            
            editCategoryForm.action = window.categoryUpdateUrl.replace('0', categoryId);
            
            editModal.show();
        });
    });
    
    saveCategoryButton.addEventListener('click', function() {
        editCategoryForm.submit();
    });
}