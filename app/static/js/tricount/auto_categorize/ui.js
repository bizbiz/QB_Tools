// app/static/js/tricount/auto_categorize/ui.js

/**
 * Module de gestion de l'interface utilisateur pour l'auto-catégorisation
 * Gère l'affichage des dépenses similaires et les interactions UI
 */

// Assurer que l'objet global existe
window.AutoCategorize = window.AutoCategorize || {};
window.AutoCategorize.UI = {};

/**
 * Rafraîchit la liste des dépenses similaires en fonction des filtres
 */
AutoCategorize.UI.refreshSimilarExpenses = function() {
    const similarExpensesContainer = document.getElementById('similar-expenses-container');
    if (!similarExpensesContainer) {
        console.error("Container for similar expenses not found");
        return;
    }
    
    // Obtenir les filtres actuels
    const filters = AutoCategorize.getFilters();
    
    // Ajouter l'ID de la dépense source
    const expenseIdInput = document.querySelector('input[name="expense_id"]');
    if (!expenseIdInput) {
        console.error("Expense ID input not found");
        return;
    }
    
    filters.expense_id = expenseIdInput.value;
    console.log("Refreshing with filters:", filters);
    
    // Afficher un indicateur de chargement
    similarExpensesContainer.innerHTML = `
        <div class="d-flex justify-content-center align-items-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
            <span class="ms-3">Recherche des dépenses correspondantes...</span>
        </div>
    `;
    
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
        console.log("Got response:", data);
        if (data.success) {
            // Vider le conteneur
            similarExpensesContainer.innerHTML = '';
            
            // Mettre à jour le compteur
            const expensesCount = document.getElementById('expenses-count');
            if (expensesCount) {
                expensesCount.textContent = data.count;
            }
            
            if (data.count > 0) {
                // Créer le tableau des dépenses
                AutoCategorize.UI.createExpensesTable(data.expenses);
                
                // Ajouter le message d'information
                const infoMessage = document.createElement('div');
                infoMessage.className = 'alert alert-info mt-3 info-message';
                infoMessage.id = 'similar-expenses-info';
                infoMessage.innerHTML = `
                    <i class="fas fa-info-circle me-2"></i>
                    Ces dépenses correspondent aux critères spécifiés. Elles seront catégorisées automatiquement si vous activez l'option "Appliquer immédiatement".
                `;
                similarExpensesContainer.appendChild(infoMessage);
            } else {
                // Créer le message "aucune dépense"
                AutoCategorize.UI.createNoExpensesMessage();
            }
            
            // Marquer que les données sont à jour
            AutoCategorize.formChanged = false;
            
            const refreshNeededBadge = document.getElementById('refresh-needed-badge');
            if (refreshNeededBadge) {
                refreshNeededBadge.classList.add('d-none');
            }
            
            const similarExpensesTable = document.getElementById('similar-expenses-table');
            if (similarExpensesTable) {
                similarExpensesTable.classList.remove('stale-data');
            }
            
            // Sauvegarder les filtres actuels
            if (typeof AutoCategorize.saveCurrentFilters === 'function') {
                AutoCategorize.saveCurrentFilters();
            }
        } else {
            // En cas d'erreur
            AutoCategorize.UI.showError(data.error || 'Erreur inconnue lors de la recherche');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        AutoCategorize.UI.showError('Erreur de communication avec le serveur. Veuillez réessayer.');
    });
};

/**
 * Crée le tableau des dépenses similaires
 * @param {Array} expenses - Liste des dépenses similaires
 */
AutoCategorize.UI.createExpensesTable = function(expenses) {
    const similarExpensesContainer = document.getElementById('similar-expenses-container');
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
        row.className = 'apply-expense-row';
        
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
    
    similarExpensesContainer.appendChild(tableContainer);
};

/**
 * Crée un message "aucune dépense" si aucune dépense similaire n'est trouvée
 */
AutoCategorize.UI.createNoExpensesMessage = function() {
    const similarExpensesContainer = document.getElementById('similar-expenses-container');
    if (!similarExpensesContainer) return;
    
    const message = document.createElement('div');
    message.className = 'alert alert-warning warning-message';
    message.id = 'no-similar-expenses';
    message.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>
        Aucune dépense similaire non catégorisée n'a été trouvée avec ces critères. Essayez de modifier les filtres ou d'élargir vos critères de recherche. Votre règle s'appliquera aux futures dépenses correspondantes.
    `;
    
    similarExpensesContainer.appendChild(message);
};

/**
 * Affiche un message d'erreur dans le conteneur
 * @param {string} errorMessage - Message d'erreur à afficher
 */
AutoCategorize.UI.showError = function(errorMessage) {
    const similarExpensesContainer = document.getElementById('similar-expenses-container');
    if (!similarExpensesContainer) return;
    
    similarExpensesContainer.innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-circle me-2"></i>
            ${errorMessage}
        </div>
    `;
};