// app/static/js/tricount/categorize.js

document.addEventListener('DOMContentLoaded', function() {
    // Category data for filtering
    window.categoryData = window.categoryData || {};
    
    const saveButtons = document.querySelectorAll('.save-button');
    const expensesCount = document.getElementById('expenses-count');
    const quickFilterFood = document.getElementById('quick-filter-food');
    const quickFilterTransport = document.getElementById('quick-filter-transport');
    const quickFilterLeisure = document.getElementById('quick-filter-leisure');
    
    // Caractéristiques pour filtrage rapide
    const foodKeywords = ['LECLERC', 'CARREFOUR', 'AUCHAN', 'LIDL', 'INTERMARCHE', 'MONOPRIX', 'FRANPRIX', 'CASINO', 'SPAR', 'PICARD', 'RESTAURANT', 'BOULANGERIE', 'BOUCHERIE', 'CAFE', 'PIZZA', 'SUSHI', 'REST', 'BURGER', 'MCDO', 'FOOD', 'GEMUSE'];
    const transportKeywords = ['SNCF', 'RATP', 'UBER', 'TAXI', 'TRANSPORT', 'TRAIN', 'BUS', 'METRO', 'ESSENCE', 'TOTAL', 'BP', 'SHELL', 'ESSO', 'TGV', 'OUIGO', 'PARKINGS', 'PARKING', 'AEROPORT', 'PEAGE'];
    const leisureKeywords = ['CINEMA', 'THEATRE', 'SPECTACLE', 'NETFLIX', 'AMAZON', 'SPOTIFY', 'DEEZER', 'YOUTUBE', 'DISNEY', 'HBO', 'FNAC', 'CULTURA', 'DECATHLON', 'SPORT', 'MUSEE', 'CONCERT', 'LIVRE', 'GAME', 'JEU', 'PLAY'];
    
    // Application des filtres rapides
    if (quickFilterFood) {
        quickFilterFood.addEventListener('click', function() {
            applyQuickFilter(foodKeywords, 'Alimentation');
        });
    }
    
    if (quickFilterTransport) {
        quickFilterTransport.addEventListener('click', function() {
            applyQuickFilter(transportKeywords, 'Transport');
        });
    }
    
    if (quickFilterLeisure) {
        quickFilterLeisure.addEventListener('click', function() {
            applyQuickFilter(leisureKeywords, 'Loisirs');
        });
    }
    
    // Fonction pour filtrer les catégories basées sur le flag sélectionné
    function filterCategoriesForExpense(expenseId) {
        const select = document.getElementById(`category-${expenseId}`);
        const flagSelect = document.getElementById(`flag-${expenseId}`);
        
        if (!select || !select.originalOptions || !flagSelect) return;
        
        const flagId = flagSelect.value;
        
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
            
            // Check if this category is available for the selected flag
            if (!categoryInfo.flagIds || categoryInfo.flagIds.includes(parseInt(flagId))) {
                const newOption = document.createElement('option');
                newOption.value = option.value;
                newOption.text = option.text;
                select.add(newOption);
            }
        });
    }

    // Initialize all flag selects
    document.querySelectorAll('.flag-select').forEach(select => {
        const expenseId = select.dataset.expenseId;
        
        select.addEventListener('change', function() {
            filterCategoriesForExpense(expenseId);
        });
    });
    
    // Initialize all category selects
    document.querySelectorAll('.category-select').forEach(select => {
        const expenseId = select.dataset.expenseId;
        
        // Save original options
        const originalOptions = Array.from(select.options).map(option => {
            return {
                value: option.value,
                text: option.text,
                disabled: option.disabled
            };
        });
        
        // Store on the select element
        select.originalOptions = originalOptions;
        
        // Initial filter
        filterCategoriesForExpense(expenseId);
    });
    
    // Fonction pour appliquer les filtres rapides
    function applyQuickFilter(keywords, categoryName) {
        const expenseCards = document.querySelectorAll('.expense-card');
        const categorySelects = document.querySelectorAll('.category-select');
        
        // Trouver l'ID de catégorie correspondant
        let categoryId = '';
        categorySelects.forEach(select => {
            Array.from(select.options).forEach(option => {
                if (option.textContent === categoryName || option.textContent.includes(categoryName)) {
                    categoryId = option.value;
                }
            });
        });
        
        if (!categoryId) return;
        
        // Appliquer la catégorie aux dépenses correspondantes
        expenseCards.forEach(card => {
            const title = card.querySelector('.card-title').textContent.toUpperCase();
            const description = card.querySelector('.card-text').textContent.toUpperCase();
            const content = title + ' ' + description;
            
            // Vérifier si la dépense correspond à un des mots-clés
            const match = keywords.some(keyword => content.includes(keyword.toUpperCase()));
            
            if (match) {
                const expenseId = card.closest('.expense-card-container').id.replace('expense-container-', '');
                const select = document.getElementById(`category-${expenseId}`);
                
                // Mettre à jour la sélection
                if (select) {
                    select.value = categoryId;
                }
            }
        });
    }
    
    // Traitement du bouton de sauvegarde
    saveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const expenseId = this.dataset.expenseId;
            const form = document.getElementById(`categorize-form-${expenseId}`);
            const formData = new FormData(form);
            
            // Vérifier si une catégorie a été sélectionnée
            const categoryId = formData.get('category_id');
            if (!categoryId) {
                alert('Veuillez sélectionner une catégorie avant d\'enregistrer.');
                return;
            }
            
            // URL pour l'API mise à jour
            const updateUrl = '/tricount/expenses/update';
            
            // Envoyer les données au serveur
            fetch(updateUrl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Masquer la carte de la dépense avec une animation
                    const container = document.getElementById(`expense-container-${expenseId}`);
                    container.style.transition = 'opacity 0.5s ease';
                    container.style.opacity = '0';
                    
                    setTimeout(() => {
                        container.style.display = 'none';
                        
                        // Mettre à jour le compteur
                        const currentCount = parseInt(expensesCount.textContent);
                        expensesCount.textContent = currentCount - 1;
                        
                        // Si toutes les dépenses sont catégorisées, afficher un message
                        if (currentCount - 1 <= 0) {
                            document.getElementById('expenses-container').innerHTML = `
                                <div class="col-12">
                                    <div class="alert alert-success">
                                        <i class="fas fa-check-circle me-2"></i>
                                        Toutes les dépenses ont été catégorisées. Vous pouvez 
                                        <a href="/tricount/import">importer de nouvelles dépenses</a> 
                                        ou consulter la <a href="/tricount/expenses">liste complète des dépenses</a>.
                                    </div>
                                </div>
                            `;
                        }
                    }, 500);
                } else {
                    alert('Erreur lors de la mise à jour: ' + (data.error || 'Erreur inconnue'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Erreur de connexion au serveur.');
            });
        });
    });
});