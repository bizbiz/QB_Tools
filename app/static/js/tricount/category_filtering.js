// app/static/js/tricount/category_filtering.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize category data (will be populated in the template)
    window.categoryData = window.categoryData || {};
    
    // Find all category selects and checkboxes
    const expenseCards = document.querySelectorAll('.expense-card-container');
    
    expenseCards.forEach(card => {
        const expenseId = card.id.replace('expense-container-', '');
        const categorySelect = document.getElementById(`category-${expenseId}`);
        const tricountCheckbox = document.getElementById(`tricount-${expenseId}`);
        const professionalCheckbox = document.getElementById(`professional-${expenseId}`);
        
        if (categorySelect && tricountCheckbox && professionalCheckbox) {
            // Save original options
            const originalOptions = Array.from(categorySelect.options).map(option => {
                return {
                    value: option.value,
                    text: option.text,
                    disabled: option.disabled
                };
            });
            
            // Store on the select element
            categorySelect.originalOptions = originalOptions;
            
            // Initial filter
            filterCategoriesForExpense(expenseId);
            
            // Add event listeners
            tricountCheckbox.addEventListener('change', () => {
                filterCategoriesForExpense(expenseId);
            });
            
            professionalCheckbox.addEventListener('change', () => {
                filterCategoriesForExpense(expenseId);
            });
        }
    });
    
    // Add category filter function
    function filterCategoriesForExpense(expenseId) {
        const select = document.getElementById(`category-${expenseId}`);
        const isTricount = document.getElementById(`tricount-${expenseId}`).checked;
        const isProfessional = document.getElementById(`professional-${expenseId}`).checked;
        
        if (!select || !select.originalOptions) return;
        
        // Clear current options
        select.innerHTML = '';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.text = 'Choisir une catégorie';
        select.add(emptyOption);
        
        // Filter and add appropriate categories
        select.originalOptions.forEach(option => {
            // Skip the empty option which we just added
            if (option.value === '') return;
            
            const categoryId = option.value;
            const categoryInfo = window.categoryData[categoryId];
            
            // If no category info (shouldn't happen), show the option
            if (!categoryInfo) {
                const newOption = document.createElement('option');
                newOption.value = option.value;
                newOption.text = option.text;
                select.add(newOption);
                return;
            }
            
            // Check if this category should be shown based on Tricount/Pro settings
            let showCategory = true;
            
            if (isTricount && !categoryInfo.includeInTricount) {
                showCategory = false;
            }
            
            if (isProfessional && !categoryInfo.isProfessional) {
                showCategory = false;
            }
            
            if (showCategory) {
                const newOption = document.createElement('option');
                newOption.value = option.value;
                newOption.text = option.text;
                
                // Add visual indication of category type
                let prefix = '';
                if (categoryInfo.includeInTricount && categoryInfo.isProfessional) {
                    prefix = '🔷🔶 '; // Both
                } else if (categoryInfo.includeInTricount) {
                    prefix = '🔷 '; // Tricount only
                } else if (categoryInfo.isProfessional) {
                    prefix = '🔶 '; // Professional only
                }
                
                newOption.text = prefix + option.text;
                select.add(newOption);
            }
        });
    }
});