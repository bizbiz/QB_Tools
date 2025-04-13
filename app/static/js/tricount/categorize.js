// app/static/js/tricount/categorize.js

document.addEventListener('DOMContentLoaded', function() {
    // Éléments DOM
    const expensesContainer = document.getElementById('expenses-container');
    const saveButtons = document.querySelectorAll('.save-button');
    const expensesCount = document.getElementById('expenses-count');
    const totalCount = document.getElementById('total-count');
    const prevButton = document.getElementById('prev-expenses');
    const nextButton = document.getElementById('next-expenses');
    
    // Variables de pagination
    const itemsPerPage = window.expensePagination.itemsPerPage || 9;
    let currentPage = window.expensePagination.currentPage || 0;
    let totalPages = window.expensePagination.totalPages || 1;
    
    // Liste d'IDs des dépenses en attente de catégorisation
    let pendingExpenseIds = window.allExpenses || [];
    
    // Liste d'IDs des dépenses actuellement affichées
    let displayedExpenseIds = [];
    updateDisplayedExpenses();
    
    // Configuration des boutons de pagination
    updatePaginationButtons();
    
    // Gestionnaire d'événement pour le bouton Précédent
    prevButton.addEventListener('click', function() {
        if (currentPage > 0) {
            currentPage--;
            showExpensesByPage(currentPage);
            updatePaginationButtons();
            
            // Réinitialiser les Select2 après avoir changé la visibilité des éléments
            setTimeout(initializePageSelect2, 100);
        }
    });
    
    // Gestionnaire d'événement pour le bouton Suivant
    nextButton.addEventListener('click', function() {
        if (currentPage < totalPages - 1) {
            currentPage++;
            showExpensesByPage(currentPage);
            updatePaginationButtons();
            
            // Réinitialiser les Select2 après avoir changé la visibilité des éléments
            setTimeout(initializePageSelect2, 100);
        }
    });
    
    // Fonction pour réinitialiser les Select2 sur la page actuelle
    function initializePageSelect2() {
        // Sélectionner uniquement les éléments visibles
        const visibleElements = document.querySelectorAll('.expense-card-container:not(.hide-card)');
        
        // Parcourir chaque élément visible
        visibleElements.forEach(container => {
            const expenseId = container.dataset.expenseId;
            
            // Réinitialiser Select2 pour les flags et catégories
            const flagSelect = $(`#flag-${expenseId}`);
            const categorySelect = $(`#category-${expenseId}`);
            
            if (flagSelect.length && flagSelect.data('select2')) {
                try {
                    flagSelect.select2('destroy');
                } catch (e) {
                    console.warn("Erreur lors de la destruction du select2 flag:", e);
                }
                
                flagSelect.select2({
                    theme: 'bootstrap-5',
                    width: '100%',
                    placeholder: flagSelect.data('placeholder') || 'Choisir un type',
                    allowClear: true,
                    minimumResultsForSearch: 10
                });
            }
            
            if (categorySelect.length && categorySelect.data('select2')) {
                try {
                    categorySelect.select2('destroy');
                } catch (e) {
                    console.warn("Erreur lors de la destruction du select2 catégorie:", e);
                }
                
                categorySelect.select2({
                    theme: 'bootstrap-5',
                    width: '100%',
                    placeholder: categorySelect.data('placeholder') || 'Choisir une catégorie',
                    allowClear: true,
                    minimumResultsForSearch: 10
                });
            }
        });
        
        // Actualiser Iconify
        if (window.Iconify) {
            window.Iconify.scan();
        }
    }
    
    // Fonction pour mettre à jour la liste des dépenses actuellement affichées
    function updateDisplayedExpenses() {
        displayedExpenseIds = [];
        
        // Parcourir tous les conteneurs de dépenses visibles
        document.querySelectorAll('.expense-card-container:not(.hide-card)').forEach(container => {
            displayedExpenseIds.push(container.dataset.expenseId);
        });
        
        console.log("Dépenses affichées:", displayedExpenseIds);
    }
    
    // Fonction pour afficher les dépenses par page
    function showExpensesByPage(page) {
        // Cacher toutes les dépenses
        document.querySelectorAll('.expense-card-container').forEach(container => {
            container.classList.add('hide-card');
        });
        
        // Calculer les indices de début et de fin
        const startIndex = page * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, pendingExpenseIds.length);
        
        // Afficher uniquement les dépenses de la page actuelle
        for (let i = startIndex; i < endIndex; i++) {
            const expenseId = pendingExpenseIds[i];
            const container = document.getElementById(`expense-container-${expenseId}`);
            
            if (container) {
                container.classList.remove('hide-card');
            }
        }
        
        // Mettre à jour la liste des dépenses affichées
        updateDisplayedExpenses();
    }
    
    // Fonction pour mettre à jour l'état des boutons de pagination
    function updatePaginationButtons() {
        prevButton.disabled = currentPage === 0;
        nextButton.disabled = currentPage >= totalPages - 1;
        
        // Mettre à jour les compteurs
        if (expensesCount) expensesCount.textContent = pendingExpenseIds.length;
        if (totalCount) totalCount.textContent = pendingExpenseIds.length;
        
        // Mise à jour du texte des pages
        const pageInfo = document.querySelector('.page-info');
        if (pageInfo) {
            const startNumber = currentPage * itemsPerPage + 1;
            const endNumber = Math.min((currentPage + 1) * itemsPerPage, pendingExpenseIds.length);
            pageInfo.innerHTML = `Affichage de ${pendingExpenseIds.length > 0 ? startNumber : 0}-${endNumber} sur <span id="total-count">${pendingExpenseIds.length}</span>`;
        }
    }
    
    // Gestionnaire pour les boutons d'enregistrement
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
                        // Supprimer la dépense catégorisée de la liste des dépenses en attente
                        pendingExpenseIds = pendingExpenseIds.filter(id => id != expenseId);
                        
                        // Recalculer le nombre total de pages
                        totalPages = Math.ceil(pendingExpenseIds.length / itemsPerPage);
                        
                        // Si la page actuelle n'a plus de contenu et n'est pas la première page, revenir à la page précédente
                        if (currentPage > 0 && currentPage >= totalPages) {
                            currentPage--;
                        }
                        
                        // Mettre à jour la liste des dépenses affichées
                        container.classList.add('hide-card');
                        showExpensesByPage(currentPage);
                        updatePaginationButtons();
                        
                        // Si toutes les dépenses sont catégorisées, afficher un message
                        if (pendingExpenseIds.length === 0) {
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
                            
                            // Masquer les boutons de pagination
                            const paginationElement = document.querySelector('.expense-pagination');
                            if (paginationElement) {
                                paginationElement.style.display = 'none';
                            }
                        } else {
                            // Réinitialiser les Select2 après avoir mis à jour la visibilité
                            setTimeout(initializePageSelect2, 100);
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
    
    // Initialiser les filtres rapides
    const quickFilterFood = document.getElementById('quick-filter-food');
    const quickFilterTransport = document.getElementById('quick-filter-transport');
    const quickFilterLeisure = document.getElementById('quick-filter-leisure');
    
    if (quickFilterFood) {
        quickFilterFood.addEventListener('click', function() {
            document.querySelectorAll('.expense-card-container:not(.hide-card)').forEach(container => {
                const expenseId = container.dataset.expenseId;
                const flagSelect = document.getElementById(`flag-${expenseId}`);
                
                // Trouver l'ID du flag "Alimentation" par son nom
                const foodFlagId = findFlagIdByName("Alimentation");
                
                if (flagSelect && foodFlagId) {
                    // Définir la valeur du select et déclencher l'événement de changement
                    flagSelect.value = foodFlagId;
                    
                    // Déclencher l'événement pour Select2
                    $(flagSelect).val(foodFlagId).trigger('change');
                }
            });
        });
    }
    
    if (quickFilterTransport) {
        quickFilterTransport.addEventListener('click', function() {
            document.querySelectorAll('.expense-card-container:not(.hide-card)').forEach(container => {
                const expenseId = container.dataset.expenseId;
                const flagSelect = document.getElementById(`flag-${expenseId}`);
                
                // Trouver l'ID du flag "Transport" par son nom
                const transportFlagId = findFlagIdByName("Transport");
                
                if (flagSelect && transportFlagId) {
                    // Définir la valeur du select et déclencher l'événement de changement
                    flagSelect.value = transportFlagId;
                    
                    // Déclencher l'événement pour Select2
                    $(flagSelect).val(transportFlagId).trigger('change');
                }
            });
        });
    }
    
    if (quickFilterLeisure) {
        quickFilterLeisure.addEventListener('click', function() {
            document.querySelectorAll('.expense-card-container:not(.hide-card)').forEach(container => {
                const expenseId = container.dataset.expenseId;
                const flagSelect = document.getElementById(`flag-${expenseId}`);
                
                // Trouver l'ID du flag "Loisirs" par son nom
                const leisureFlagId = findFlagIdByName("Loisirs");
                
                if (flagSelect && leisureFlagId) {
                    // Définir la valeur du select et déclencher l'événement de changement
                    flagSelect.value = leisureFlagId;
                    
                    // Déclencher l'événement pour Select2
                    $(flagSelect).val(leisureFlagId).trigger('change');
                }
            });
        });
    }
    
    // Fonction utilitaire pour trouver l'ID d'un flag par son nom
    function findFlagIdByName(flagName) {
        if (!window.flagData) return null;
        
        for (const [id, flag] of Object.entries(window.flagData)) {
            if (flag.name === flagName) {
                return id;
            }
        }
        
        return null;
    }
});