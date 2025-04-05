// app/static/js/tricount_categorize.js

document.addEventListener('DOMContentLoaded', function() {
    // Compteur pour les dépenses affichées
    const expensesCount = document.getElementById('expenses-count');
    const expenseCards = document.querySelectorAll('.expense-card-container');
    
    // Filtres rapides
    const quickFilterFood = document.getElementById('quick-filter-food');
    const quickFilterTransport = document.getElementById('quick-filter-transport');
    const quickFilterLeisure = document.getElementById('quick-filter-leisure');
    
    // Caractéristiques pour filtrage rapide
    const foodKeywords = ['LECLERC', 'CARREFOUR', 'AUCHAN', 'LIDL', 'INTERMARCHE', 'MONOPRIX', 'FRANPRIX', 'CASINO', 'SPAR', 'PICARD', 'RESTAURANT', 'BOULANGERIE', 'BOUCHERIE', 'CAFE', 'PIZZA', 'SUSHI', 'REST', 'BURGER', 'MCDO', 'FOOD', 'GEMUSE'];
    const transportKeywords = ['SNCF', 'RATP', 'UBER', 'TAXI', 'TRANSPORT', 'TRAIN', 'BUS', 'METRO', 'ESSENCE', 'TOTAL', 'BP', 'SHELL', 'ESSO', 'TGV', 'OUIGO', 'PARKINGS', 'PARKING', 'AEROPORT', 'PEAGE'];
    const leisureKeywords = ['CINEMA', 'THEATRE', 'SPECTACLE', 'NETFLIX', 'AMAZON', 'SPOTIFY', 'DEEZER', 'YOUTUBE', 'DISNEY', 'HBO', 'FNAC', 'CULTURA', 'DECATHLON', 'SPORT', 'MUSEE', 'CONCERT', 'LIVRE', 'GAME', 'JEU', 'PLAY'];
    
    // Initialisation des catégories
    window.categoryData = window.categoryData || {};
    
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
                
                // Set Tricount and Pro checkboxes appropriately based on the category
                const categoryInfo = window.categoryData[categoryId];
                if (categoryInfo) {
                    document.getElementById(`tricount-${expenseId}`).checked = categoryInfo.includeInTricount;
                    document.getElementById(`professional-${expenseId}`).checked = categoryInfo.isProfessional;
                    
                    // Re-filter categories based on new checkbox values
                    filterCategoriesForExpense(expenseId);
                }
                
                // Mettre à jour la sélection
                if (select) {
                    select.value = categoryId;
                }
            }
        });
    }
    
    // Function to filter categories based on Tricount/Pro checkboxes
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
                select.add(newOption);
            }
        });
    }
    
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
        
        // Add event listeners to checkboxes
        const tricountCheckbox = document.getElementById(`tricount-${expenseId}`);
        const professionalCheckbox = document.getElementById(`professional-${expenseId}`);
        
        if (tricountCheckbox) {
            tricountCheckbox.addEventListener('change', function() {
                filterCategoriesForExpense(expenseId);
            });
        }
        
        if (professionalCheckbox) {
            professionalCheckbox.addEventListener('change', function() {
                filterCategoriesForExpense(expenseId);
            });
        }
        
        // Initial filter
        filterCategoriesForExpense(expenseId);
    });
    
    // Gestion des boutons de sauvegarde
    const saveButtons = document.querySelectorAll('.save-button');
    
    if (saveButtons) {
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
                
                // Ajouter les valeurs des checkboxes (même si non cochées)
                formData.set('include_tricount', form.querySelector(`#tricount-${expenseId}`).checked ? 'true' : 'false');
                formData.set('is_professional', form.querySelector(`#professional-${expenseId}`).checked ? 'true' : 'false');
                
                // Envoyer les données au serveur
                fetch('/tricount/expenses/update', {
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
                            if (expensesCount) {
                                const currentCount = parseInt(expensesCount.textContent);
                                expensesCount.textContent = currentCount - 1;
                                
                                // Si toutes les dépenses sont catégorisées, afficher un message
                                if (currentCount - 1 <= 0) {
                                    const container = document.getElementById('expenses-container');
                                    if (container) {
                                        container.innerHTML = `
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
                                }
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
    }
});

// Fonctionnalité pour suggérer des catégories en fonction du nom du marchand
function suggestCategoriesFromMerchant() {
    const merchantKeywords = {
        'restaurant': 'Alimentation',
        'boulangerie': 'Alimentation',
        'carrefour': 'Alimentation',
        'leclerc': 'Alimentation',
        'lidl': 'Alimentation',
        'auchan': 'Alimentation',
        
        'sncf': 'Transport',
        'uber': 'Transport',
        'taxi': 'Transport',
        'ratp': 'Transport',
        'train': 'Transport',
        'essence': 'Transport',
        
        'netflix': 'Abonnements',
        'spotify': 'Abonnements',
        'amazon prime': 'Abonnements',
        'disney': 'Abonnements',
        'canal': 'Abonnements',
        
        'cinema': 'Loisirs',
        'theatre': 'Loisirs',
        'concert': 'Loisirs',
        'musee': 'Loisirs',
        
        'doctor': 'Santé',
        'pharmacie': 'Santé',
        'medecin': 'Santé',
        'dentiste': 'Santé',
    };
    
    // Pour chaque carte de dépense
    const expenseCards = document.querySelectorAll('.expense-card');
    
    expenseCards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const select = card.querySelector('.category-select');
        
        if (!select) return;
        
        // Chercher si un mot-clé correspond
        for (const [keyword, category] of Object.entries(merchantKeywords)) {
            if (title.includes(keyword)) {
                // Chercher la catégorie dans le select
                const option = Array.from(select.options).find(opt => opt.textContent === category || opt.textContent.includes(category));
                
                if (option) {
                    // Présélectionner la catégorie
                    select.value = option.value;
                    
                    // Récupérer les informations de la catégorie pour les checkboxes
                    const expenseId = card.closest('.expense-card-container').id.replace('expense-container-', '');
                    const categoryInfo = window.categoryData[option.value];
                    
                    if (categoryInfo) {
                        const tricountCheckbox = document.getElementById(`tricount-${expenseId}`);
                        const professionalCheckbox = document.getElementById(`professional-${expenseId}`);
                        
                        if (tricountCheckbox) tricountCheckbox.checked = categoryInfo.includeInTricount;
                        if (professionalCheckbox) professionalCheckbox.checked = categoryInfo.isProfessional;
                    }
                    
                    break; // Sortir de la boucle une fois une correspondance trouvée
                }
            }
        }
    });
}

// Appeler la suggestion de catégories après le chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Appeler après l'initialisation des catégories
    setTimeout(suggestCategoriesFromMerchant, 500);
});