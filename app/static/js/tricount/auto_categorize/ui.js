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
    const similarExpensesBody = document.getElementById('similar-expenses-body');
    if (!similarExpensesBody) return;
    
    // Obtenir les filtres actuels
    const filters = AutoCategorize.getFilters();
    
    // Ajouter l'ID de la dépense source
    filters.expense_id = document.getElementById('rule-form').querySelector('input[name="expense_id"]').value;
    
    // DÉBOGAGE: Afficher les filtres envoyés
    console.log('Filtres envoyés au serveur:', JSON.stringify(filters, null, 2));
    
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
    .then(response => {
        // DÉBOGAGE: Vérifier le statut de la réponse
        console.log('Statut de la réponse:', response.status);
        return response.json();
    })
    .then(data => {
        // DÉBOGAGE: Afficher les données reçues
        console.log('Données reçues du serveur:', data);
        
        if (data.success) {
            // Mettre à jour le tableau
            AutoCategorize.UI.updateSimilarExpensesTable(data.expenses);
            
            // Mettre à jour le compteur
            const expensesCount = document.getElementById('expenses-count');
            if (expensesCount) {
                expensesCount.textContent = data.count;
            }
            
            // Mettre à jour le message d'informations
            AutoCategorize.UI.updateExpensesMessage(data.count, data.expenses);
            
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
            AutoCategorize.saveCurrentFilters();
            console.log('Filtres actuels sauvegardés:', AutoCategorize.currentFilters);
        } else {
            // En cas d'erreur
            console.error('Erreur retournée par le serveur:', data.error);
            AutoCategorize.UI.showError(data.error || 'Erreur inconnue');
        }
    })
    .catch(error => {
        console.error('Erreur de communication avec le serveur:', error);
        AutoCategorize.UI.showError('Erreur de communication avec le serveur. Veuillez réessayer.');
    });
};

/**
 * Met à jour le tableau des dépenses similaires
 * @param {Array} expenses - Liste des dépenses similaires
 */
AutoCategorize.UI.updateSimilarExpensesTable = function(expenses) {
    const similarExpensesBody = document.getElementById('similar-expenses-body');
    if (!similarExpensesBody) return;
    
    // Effacer le contenu actuel
    similarExpensesBody.innerHTML = '';
    
    // Afficher les dépenses
    if (expenses.length > 0) {
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
            
            similarExpensesBody.appendChild(row);
        });
        
        const similarExpensesTable = document.getElementById('similar-expenses-table');
        if (similarExpensesTable) {
            similarExpensesTable.style.display = 'table';
        }
    }
};

/**
 * Met à jour le message d'informations sur les dépenses similaires
 * @param {number} count - Nombre de dépenses trouvées
 * @param {Array} expenses - Liste des dépenses similaires
 */
AutoCategorize.UI.updateExpensesMessage = function(count, expenses) {
    const similarExpensesContainer = document.getElementById('similar-expenses-container');
    const noSimilarExpenses = document.getElementById('no-similar-expenses');
    const similarExpensesInfo = document.getElementById('similar-expenses-info');
    const similarExpensesTable = document.getElementById('similar-expenses-table');
    
    if (count > 0) {
        // Cacher le message "aucune dépense"
        if (noSimilarExpenses) {
            noSimilarExpenses.style.display = 'none';
        }
        
        // Créer ou afficher le tableau
        if (!similarExpensesTable || document.getElementById('similar-expenses-table') === null) {
            AutoCategorize.UI.createExpensesTable(expenses);
        } else {
            similarExpensesTable.style.display = 'table';
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
            AutoCategorize.UI.createNoExpensesMessage();
        } else {
            noSimilarExpenses.style.display = 'block';
        }
    }
};

/**
 * Affiche un message d'erreur dans le tableau
 * @param {string} errorMessage - Message d'erreur à afficher
 */
AutoCategorize.UI.showError = function(errorMessage) {
    const similarExpensesBody = document.getElementById('similar-expenses-body');
    if (!similarExpensesBody) return;
    
    similarExpensesBody.innerHTML = `
        <tr>
            <td colspan="3" class="text-center py-3">
                <div class="alert alert-danger mb-0">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Erreur lors de la recherche des dépenses similaires: ${errorMessage}
                </div>
            </td>
        </tr>
    `;
};

/**
 * Crée le tableau des dépenses similaires s'il n'existe pas
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
    
    // Ajouter le message d'info
    const infoMessage = document.createElement('div');
    infoMessage.className = 'alert alert-info mt-3';
    infoMessage.id = 'similar-expenses-info';
    infoMessage.innerHTML = `
        <i class="fas fa-info-circle me-2"></i>
        Ces dépenses correspondent aux critères spécifiés. Elles seront catégorisées automatiquement si vous activez l'option "Appliquer immédiatement".
    `;
    
    // Supprimer le message "aucune dépense" s'il existe
    if (document.getElementById('no-similar-expenses')) {
        document.getElementById('no-similar-expenses').style.display = 'none';
    }
    
    // Ajouter le tableau et le message au conteneur
    similarExpensesContainer.innerHTML = '';
    similarExpensesContainer.appendChild(tableContainer);
    similarExpensesContainer.appendChild(infoMessage);
};

/**
 * Crée un message "aucune dépense" si aucune dépense similaire n'est trouvée
 */
AutoCategorize.UI.createNoExpensesMessage = function() {
    const similarExpensesContainer = document.getElementById('similar-expenses-container');
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
};