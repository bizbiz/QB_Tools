// app/static/js/tricount/auto_categorize.js

document.addEventListener('DOMContentLoaded', function() {
    // Variables pour tracker l'état
    let formChanged = false;
    let currentFilters = {};
    
    // Gestion de l'affichage du jour de fréquence
    const frequencyType = document.getElementById('frequency-type');
    const frequencyDayContainer = document.getElementById('frequency-day-container');
    const frequencyDayHelp = document.getElementById('frequency-day-help');
    const frequencyDay = document.getElementById('frequency-day');
    const merchantContains = document.getElementById('merchant-contains');
    const descriptionContains = document.getElementById('description-contains');
    const similarExpensesTable = document.getElementById('similar-expenses-table');
    const refreshButton = document.getElementById('refresh-similar-expenses');
    const refreshNeededBadge = document.getElementById('refresh-needed-badge');
    const similarExpensesBody = document.getElementById('similar-expenses-body');
    const expensesCount = document.getElementById('expenses-count');
    const noSimilarExpenses = document.getElementById('no-similar-expenses');
    const similarExpensesInfo = document.getElementById('similar-expenses-info');
    const similarExpensesContainer = document.getElementById('similar-expenses-container');
    
    // Sauvegarder les valeurs initiales
    saveCurrentFilters();
    
    // Événement pour le changement de type de fréquence
    if (frequencyType) {
        frequencyType.addEventListener('change', function() {
            updateFrequencyDayVisibility();
            markFormChanged();
        });
    }
    
    // Fonction pour mettre à jour la visibilité du champ de jour
    function updateFrequencyDayVisibility() {
        if (!frequencyType || !frequencyDayContainer) return;
        
        if (frequencyType.value === 'none') {
            frequencyDayContainer.style.display = 'none';
        } else {
            frequencyDayContainer.style.display = 'block';
            
            if (frequencyType.value === 'monthly') {
                frequencyDayHelp.textContent = 'Jour du mois (1-31) pour la fréquence mensuelle.';
                frequencyDay.max = 31;
            } else if (frequencyType.value === 'weekly') {
                frequencyDayHelp.textContent = 'Jour de la semaine (0=Lundi, 6=Dimanche) pour la fréquence hebdomadaire.';
                frequencyDay.max = 6;
            }
        }
    }
    
    // Appliquer la visibilité initiale
    updateFrequencyDayVisibility();
    
    // Détecter les changements dans tous les champs du formulaire
    document.querySelectorAll('.rule-input').forEach(input => {
        input.addEventListener('input', markFormChanged);
        input.addEventListener('change', markFormChanged);
    });
    
    // Fonction pour marquer que le formulaire a changé
    function markFormChanged() {
        // Vérifier si les filtres ont réellement changé
        const newFilters = getFilters();
        const hasChanges = JSON.stringify(newFilters) !== JSON.stringify(currentFilters);
        
        if (hasChanges) {
            formChanged = true;
            
            if (refreshNeededBadge) {
                refreshNeededBadge.classList.remove('d-none');
            }
            
            if (similarExpensesTable) {
                similarExpensesTable.classList.add('stale-data');
            }
        }
    }
    
    // Fonction pour sauvegarder les filtres actuels
    function saveCurrentFilters() {
        currentFilters = getFilters();
    }
    
    // Fonction pour obtenir les filtres actuels
    function getFilters() {
        return {
            merchant_contains: merchantContains ? merchantContains.value : '',
            description_contains: descriptionContains ? descriptionContains.value : '',
            frequency_type: frequencyType ? frequencyType.value : 'none',
            frequency_day: (frequencyType && frequencyType.value !== 'none' && frequencyDay) ? 
                parseInt(frequencyDay.value) : null
        };
    }
    
    // Événement pour le bouton de rafraîchissement
    if (refreshButton) {
        refreshButton.addEventListener('click', refreshSimilarExpenses);
    }
    
    // Fonction pour rafraîchir la liste des dépenses similaires
    function refreshSimilarExpenses() {
        if (!similarExpensesBody) return;
        
        // Obtenir les filtres actuels
        const filters = getFilters();
        
        // Ajouter l'ID de la dépense source
        filters.expense_id = document.getElementById('rule-form').querySelector('input[name="expense_id"]').value;
        
        // Afficher un indicateur de chargement
        similarExpensesBody.innerHTML = '<tr><td colspan="3" class="text-center py-3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Chargement...</span></div></td></tr>';
        
        // Faire la requête AJAX
        fetch('/tricount/find-similar-expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(filters)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Mettre à jour le tableau
                updateSimilarExpensesTable(data.expenses);
                
                // Mettre à jour le compteur
                if (expensesCount) {
                    expensesCount.textContent = data.count;
                }
                
                // Mettre à jour le message d'informations
                if (data.count > 0) {
                    if (noSimilarExpenses) {
                        noSimilarExpenses.style.display = 'none';
                    }
                    
                    if (!similarExpensesTable) {
                        createExpensesTable(data.expenses);
                    }
                    
                    // Mettre à jour le texte du message d'info
                    if (similarExpensesInfo) {
                        similarExpensesInfo.innerHTML = `
                            <i class="fas fa-info-circle me-2"></i>
                            Ces dépenses correspondent aux critères spécifiés. Elles seront catégorisées automatiquement si vous activez l'option "Appliquer immédiatement".
                        `;
                        similarExpensesInfo.style.display = 'block';
                    }
                } else {
                    // Aucune dépense trouvée
                    if (similarExpensesTable) {
                        similarExpensesTable.style.display = 'none';
                    }
                    
                    if (similarExpensesInfo) {
                        similarExpensesInfo.style.display = 'none';
                    }
                    
                    if (!noSimilarExpenses) {
                        createNoExpensesMessage();
                    } else {
                        noSimilarExpenses.style.display = 'block';
                    }
                }
                
                // Marquer que les données sont à jour
                formChanged = false;
                if (refreshNeededBadge) {
                    refreshNeededBadge.classList.add('d-none');
                }
                
                if (similarExpensesTable) {
                    similarExpensesTable.classList.remove('stale-data');
                }
                
                // Sauvegarder les filtres actuels
                saveCurrentFilters();
            } else {
                // En cas d'erreur
                similarExpensesBody.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center py-3">
                            <div class="alert alert-danger mb-0">
                                <i class="fas fa-exclamation-circle me-2"></i>
                                Erreur lors de la recherche des dépenses similaires: ${data.error || 'Erreur inconnue'}
                            </div>
                        </td>
                    </tr>
                `;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            if (similarExpensesBody) {
                similarExpensesBody.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center py-3">
                            <div class="alert alert-danger mb-0">
                                <i class="fas fa-exclamation-circle me-2"></i>
                                Erreur de communication avec le serveur. Veuillez réessayer.
                            </div>
                        </td>
                    </tr>
                `;
            }
        });
    }
    
    // Fonction pour mettre à jour le tableau des dépenses similaires
    function updateSimilarExpensesTable(expenses) {
        if (!similarExpensesBody) return;
        
        // Effacer le contenu actuel
        similarExpensesBody.innerHTML = '';
        
        // Afficher les dépenses
        if (expenses.length > 0) {
            expenses.forEach(expense => {
                const row = document.createElement('tr');
                
                // Cellule de date
                const dateCell = document.createElement('td');
                dateCell.textContent = expense.date;
                row.appendChild(dateCell);
                
                // Cellule du marchand
                const merchantCell = document.createElement('td');
                merchantCell.textContent = expense.merchant;
                row.appendChild(merchantCell);
                
                // Cellule du montant
                const amountCell = document.createElement('td');
                amountCell.textContent = `${expense.is_debit ? '-' : ''}${expense.amount.toFixed(2)} €`;
                amountCell.className = expense.is_debit ? 'text-danger' : 'text-success';
                row.appendChild(amountCell);
                
                similarExpensesBody.appendChild(row);
            });
            
            if (similarExpensesTable) {
                similarExpensesTable.style.display = 'table';
            }
        }
    }
    
    // Fonction pour créer un tableau de dépenses si absent
    function createExpensesTable(expenses) {
        if (!similarExpensesContainer) return;
        
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-responsive';
        
        const table = document.createElement('table');
        table.className = 'table table-hover';
        table.id = 'similar-expenses-table';
        
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Date</th>
                <th>Marchand</th>
                <th>Montant</th>
            </tr>
        `;
        
        const tbody = document.createElement('tbody');
        tbody.id = 'similar-expenses-body';
        
        expenses.forEach(expense => {
            const row = document.createElement('tr');
            
            // Cellule de date
            const dateCell = document.createElement('td');
            dateCell.textContent = expense.date;
            row.appendChild(dateCell);
            
            // Cellule du marchand
            const merchantCell = document.createElement('td');
            merchantCell.textContent = expense.merchant;
            row.appendChild(merchantCell);
            
            // Cellule du montant
            const amountCell = document.createElement('td');
            amountCell.textContent = `${expense.is_debit ? '-' : ''}${expense.amount.toFixed(2)} €`;
            amountCell.className = expense.is_debit ? 'text-danger' : 'text-success';
            row.appendChild(amountCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        
        // Ajouter le message d'info
        const infoMessage = document.createElement('div');
        infoMessage.className = 'alert alert-info mt-3';
        infoMessage.id = 'similar-expenses-info';
        infoMessage.innerHTML = `
            <i class="fas fa-info-circle me-2"></i>
            Ces dépenses correspondent aux critères spécifiés. Elles seront catégorisées automatiquement si vous activez l'option "Appliquer immédiatement".
        `;
        
        // Supprimer le message "aucune dépense" s'il existe
        if (noSimilarExpenses) {
            noSimilarExpenses.style.display = 'none';
        }
        
        // Ajouter le tableau et le message au conteneur
        similarExpensesContainer.innerHTML = '';
        similarExpensesContainer.appendChild(tableContainer);
        similarExpensesContainer.appendChild(infoMessage);
    }
    
    // Fonction pour créer un message "aucune dépense"
    function createNoExpensesMessage() {
        if (!similarExpensesContainer) return;
        
        const message = document.createElement('div');
        message.className = 'alert alert-warning';
        message.id = 'no-similar-expenses';
        message.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            Aucune dépense similaire non catégorisée n'a été trouvée. Votre règle s'appliquera aux futures dépenses.
        `;
        
        similarExpensesContainer.innerHTML = '';
        similarExpensesContainer.appendChild(message);
    }
    
    // Gestion du lien entre catégorie et options Tricount/Pro
    const categorySelect = document.getElementById('category-id');
    const tricountCheckbox = document.getElementById('include-tricount');
    const professionalCheckbox = document.getElementById('is-professional');
    
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            const categoryId = this.value;
            if (!categoryId) return;
            
            // Récupérer les informations de catégorie
            fetch(`/tricount/category/${categoryId}/info`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        if (tricountCheckbox) tricountCheckbox.checked = data.include_in_tricount;
                        if (professionalCheckbox) professionalCheckbox.checked = data.is_professional;
                    }
                })
                .catch(error => console.error('Error:', error));
        });
    }
});