// app/static/js/tricount/auto_categorize/ui.js

/**
 * Module de gestion de l'interface utilisateur pour l'auto-catégorisation
 * Gère l'affichage des dépenses similaires et les interactions UI
 */

// Assurer que l'objet global existe
window.AutoCategorize = window.AutoCategorize || {};
window.AutoCategorize.UI = window.AutoCategorize.UI || {};

/**
 * Initialise les composants UI
 */
AutoCategorize.UI.init = function() {
    // Initialiser le bouton de rafraîchissement
    const refreshButton = document.getElementById('refresh-similar-expenses');
    if (refreshButton) {
        refreshButton.addEventListener('click', AutoCategorize.UI.refreshSimilarExpenses);
    }
    
    // Initialiser les badges de conflit
    AutoCategorize.UI.initConflictBadges();
};

/**
 * Initialise les badges de conflit
 */
AutoCategorize.UI.initConflictBadges = function() {
    // Initialiser les tooltips pour les badges de conflit
    const conflictBadges = document.querySelectorAll('.conflict-badge');
    
    conflictBadges.forEach(badge => {
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
            new bootstrap.Tooltip(badge);
        }
        
        // Ajouter l'événement de clic pour afficher le détail du conflit
        badge.addEventListener('click', function(e) {
            e.preventDefault();
            const row = this.closest('tr');
            const expenseId = row.dataset.expenseId;
            
            if (typeof AutoCategorize.UI.showConflictDetails === 'function') {
                AutoCategorize.UI.showConflictDetails(expenseId);
            }
        });
    });
    
    // Mettre à jour le compteur de conflits
    const conflictCount = document.getElementById('conflict-count');
    if (conflictCount && conflictBadges.length > 0) {
        conflictCount.textContent = conflictBadges.length;
        conflictCount.classList.remove('d-none');
    }
};

/**
 * Rafraîchit la liste des dépenses similaires en fonction des filtres
 */
AutoCategorize.UI.refreshSimilarExpenses = function() {
    const similarExpensesContainer = document.getElementById('similar-expenses-container');
    if (!similarExpensesContainer) {
        console.error("Container for similar expenses not found");
        return;
    }
    
    // Afficher un indicateur de chargement
    similarExpensesContainer.innerHTML = `
        <div class="d-flex justify-content-center align-items-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
            <span class="ms-3">Recherche des dépenses correspondantes...</span>
        </div>
    `;
    
    // Obtenir les filtres actuels
    const filters = AutoCategorize.getFilters ? AutoCategorize.getFilters() : {
        expense_id: document.querySelector('input[name="expense_id"]').value,
        merchant_contains: document.getElementById('merchant-contains')?.value || '',
        description_contains: document.getElementById('description-contains')?.value || '',
        min_amount: parseFloat(document.getElementById('min-amount')?.value) || null,
        max_amount: parseFloat(document.getElementById('max-amount')?.value) || null
    };
    
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
        console.log("Response from server:", data);
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
            
            // Masquer le badge de notification
            const refreshNeededBadge = document.getElementById('refresh-needed-badge');
            if (refreshNeededBadge) {
                refreshNeededBadge.classList.add('d-none');
            }
            
            // Retirer la classe "stale-data"
            const similarExpensesTable = document.getElementById('similar-expenses-table');
            if (similarExpensesTable) {
                similarExpensesTable.classList.remove('stale-data');
            }
            
            // Sauvegarder les filtres actuels si la fonction existe
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
            <th>Statut</th>
        </tr>
    `;
    
    const tbody = document.createElement('tbody');
    tbody.id = 'similar-expenses-body';
    
    expenses.forEach(expense => {
        const row = document.createElement('tr');
        row.className = 'apply-expense-row';
        row.dataset.expenseId = expense.id;
        
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
        
        // Cellule de statut
        const statusCell = document.createElement('td');
        statusCell.className = 'text-center';
        statusCell.innerHTML = `
            <span class="badge bg-success">
                <i class="fas fa-check"></i>
            </span>
        `;
        row.appendChild(statusCell);
        
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

/**
 * Affiche les détails d'un conflit pour une dépense spécifique
 * @param {string} expenseId - ID de la dépense en conflit
 */
AutoCategorize.UI.showConflictDetails = function(expenseId) {
    // Récupérer les informations sur le conflit via API
    fetch('/tricount/expense-rule-conflict/' + expenseId)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remplir les détails de la règle
                const ruleDetailsContainer = document.getElementById('conflict-rule-details');
                if (ruleDetailsContainer) {
                    let html = `
                        <div class="card-header">
                            <h5 class="card-title">${data.rule.name}</h5>
                        </div>
                        <div class="card-body">
                            <p><strong>Filtres:</strong></p>
                            <ul>
                    `;
                    
                    if (data.rule.merchant_contains) {
                        html += `<li>Marchand contient: ${data.rule.merchant_contains}</li>`;
                    }
                    
                    if (data.rule.description_contains) {
                        html += `<li>Description contient: ${data.rule.description_contains}</li>`;
                    }
                    
                    html += `
                            </ul>
                            <p><strong>Actions:</strong></p>
                            <ul>
                    `;
                    
                    if (data.rule.apply_category) {
                        html += `<li>Catégoriser en "${data.rule.category_name}"</li>`;
                    }
                    
                    if (data.rule.apply_flag) {
                        html += `<li>Appliquer le type "${data.rule.flag_name}"</li>`;
                    }
                    
                    if (data.rule.apply_rename) {
                        html += `<li>Renommer selon le motif "${data.rule.rename_pattern}"</li>`;
                    }
                    
                    html += `
                            </ul>
                        </div>
                    `;
                    
                    ruleDetailsContainer.innerHTML = html;
                }
                
                // Configurer le bouton d'édition
                const editButton = document.getElementById('edit-conflict-rule-btn');
                if (editButton) {
                    editButton.href = '/tricount/auto-rules/edit/' + data.rule.id;
                }
                
                // Afficher la modal
                const modal = new bootstrap.Modal(document.getElementById('conflict-detail-modal'));
                modal.show();
            } else {
                alert('Erreur lors de la récupération des détails du conflit.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Erreur de communication avec le serveur.');
        });
};

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    if (typeof AutoCategorize.UI.init === 'function') {
        AutoCategorize.UI.init();
    }
});