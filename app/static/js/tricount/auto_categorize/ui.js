// app/static/js/tricount/auto_categorize/ui.js

// Étendre les fonctionnalités du sous-module UI
(function() {
    const UI = window.AutoCategorize.UI;

    /**
     * Initialise les indicateurs de conflit sur les dépenses
     */
    UI.initConflictIndicators = function() {
        const conflictBadges = document.querySelectorAll('.conflict-badge');
        
        conflictBadges.forEach(badge => {
            if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                new bootstrap.Tooltip(badge, {
                    html: true, 
                    placement: 'left',
                    title: badge.dataset.tooltip || "Cette dépense est déjà affectée par une règle existante"
                });
            }
            
            // Ajouter l'événement de clic pour afficher les détails
            badge.addEventListener('click', function(e) {
                e.preventDefault();
                const row = this.closest('tr');
                const expenseId = row.dataset.expenseId;
                const ruleId = this.dataset.ruleId;
                
                UI.showConflictDetails(expenseId, ruleId);
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
     * Crée une cellule de statut avec l'indicateur de conflit approprié
     * @param {Object} expense - Données de la dépense
     * @returns {string} - HTML de la cellule de statut
     */
    UI.createStatusCell = function(expense) {
        if (expense.conflict) {
            // Badge avec croix rouge pour les conflits
            return `
                <td class="text-center">
                    <span class="badge bg-danger conflict-badge" 
                          data-bs-toggle="tooltip" 
                          data-rule-id="${expense.conflict.rule_id}"
                          data-tooltip="<strong>Conflit</strong><br>Cette dépense est déjà affectée par la règle:<br><strong>${expense.conflict.rule_name}</strong><br>Cliquez pour plus de détails">
                        <i class="fas fa-times"></i>
                    </span>
                </td>
            `;
        } else {
            // Badge vert avec coche pour les dépenses sans conflit
            return `
                <td class="text-center">
                    <span class="badge bg-success">
                        <i class="fas fa-check"></i>
                    </span>
                </td>
            `;
        }
    };

    /**
     * Affiche les détails d'un conflit dans une modal
     * @param {string} expenseId - ID de la dépense
     * @param {string} ruleId - ID de la règle en conflit
     */
    UI.showConflictDetails = function(expenseId, ruleId) {
        // Récupérer les informations détaillées sur la règle en conflit
        fetch(`/tricount/rule-details/${ruleId}?expense_id=${expenseId}`)
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
                        
                        if (data.rule.min_amount || data.rule.max_amount) {
                            html += `<li>Montant: `;
                            if (data.rule.min_amount) html += `min. ${data.rule.min_amount}€ `;
                            if (data.rule.min_amount && data.rule.max_amount) html += `- `;
                            if (data.rule.max_amount) html += `max. ${data.rule.max_amount}€`;
                            html += `</li>`;
                        }
                        
                        html += `
                                </ul>
                                <p><strong>Actions:</strong></p>
                                <ul>
                        `;
                        
                        if (data.rule.apply_category) {
                            html += `<li>Catégoriser en "${data.rule.category_name || 'Non définie'}"</li>`;
                        }
                        
                        if (data.rule.apply_flag) {
                            html += `<li>Appliquer le type "${data.rule.flag_name || 'Non défini'}"</li>`;
                        }
                        
                        if (data.rule.apply_rename) {
                            html += `<li>Renommer selon le motif "${data.rule.rename_pattern || ''}"</li>`;
                        }
                        
                        html += `
                                </ul>
                                <div class="alert alert-info mb-0">
                                    <i class="fas fa-info-circle me-2"></i>
                                    <p>Options pour résoudre ce conflit:</p>
                                    <ol class="mb-0">
                                        <li>Modifier votre règle actuelle pour éviter ce conflit</li>
                                        <li>Modifier la règle existante via le bouton ci-dessous</li>
                                    </ol>
                                </div>
                            </div>
                        `;
                        
                        ruleDetailsContainer.innerHTML = html;
                    }
                    
                    // Configurer le bouton d'édition
                    const editButton = document.getElementById('edit-conflict-rule-btn');
                    if (editButton) {
                        editButton.href = `/tricount/auto-rules/edit/${data.rule.id}`;
                    }
                    
                    // Afficher la modal
                    const modal = new bootstrap.Modal(document.getElementById('conflict-detail-modal'));
                    modal.show();
                } else {
                    alert('Erreur lors de la récupération des détails de la règle en conflit.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Erreur de communication avec le serveur.');
            });
    };

    /**
     * Méthode pour rafraîchir les dépenses similaires
     */
    UI.refreshSimilarExpenses = function() {
        // Obtenir les filtres actuels
        const filters = window.AutoCategorize.getFilters ? window.AutoCategorize.getFilters() : {};
        
        // Afficher un indicateur de chargement
        const container = document.getElementById('similar-expenses-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Chargement...</span>
                    </div>
                    <p class="mt-2">Recherche des dépenses similaires...</p>
                </div>
            `;
        }
        
        // Appeler l'API pour obtenir les dépenses similaires
        fetch('/tricount/find-similar-expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(filters)
        })
        .then(response => response.json())
        .then(data => {
            // Masquer le badge de notification
            const refreshNeededBadge = document.getElementById('refresh-needed-badge');
            if (refreshNeededBadge) {
                refreshNeededBadge.classList.add('d-none');
            }
            
            // Réinitialiser le conteneur
            if (container) {
                container.innerHTML = '';
            }
            
            if (data.success) {
                if (data.expenses && data.expenses.length > 0) {
                    // Mettre à jour le compteur
                    const expensesCount = document.getElementById('expenses-count');
                    if (expensesCount) {
                        expensesCount.textContent = data.count;
                    }
                    
                    // Afficher les dépenses dans un tableau
                    UI.createExpensesTable(data.expenses);
                    
                    // Ajouter le message d'information
                    const infoMessage = document.createElement('div');
                    infoMessage.className = 'alert alert-info mt-3 info-message';
                    infoMessage.id = 'similar-expenses-info';
                    infoMessage.innerHTML = `
                        <i class="fas fa-info-circle me-2"></i>
                        Ces dépenses correspondent aux critères spécifiés. Elles seront catégorisées automatiquement si vous activez l'option "Appliquer immédiatement".
                    `;
                    container.appendChild(infoMessage);
                } else {
                    // Aucune dépense trouvée
                    const warningMessage = document.createElement('div');
                    warningMessage.className = 'alert alert-warning warning-message';
                    warningMessage.id = 'no-similar-expenses';
                    warningMessage.innerHTML = `
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Aucune dépense similaire non catégorisée n'a été trouvée. Votre règle s'appliquera aux futures dépenses.
                    `;
                    container.appendChild(warningMessage);
                }
                
                // Réinitialiser l'état du formulaire
                window.AutoCategorize.formChanged = false;
                if (window.AutoCategorize.saveCurrentFilters) {
                    window.AutoCategorize.saveCurrentFilters();
                }
                
                // Enlever la classe stale-data
                const table = document.getElementById('similar-expenses-table');
                if (table) {
                    table.classList.remove('stale-data');
                }
            } else {
                // Afficher un message d'erreur
                const errorMessage = document.createElement('div');
                errorMessage.className = 'alert alert-danger';
                errorMessage.innerHTML = `
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Erreur lors de la récupération des dépenses: ${data.error || 'Erreur inconnue'}
                `;
                container.appendChild(errorMessage);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Afficher un message d'erreur
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Erreur de communication avec le serveur.
                    </div>
                `;
            }
        });
    };

    /**
     * Crée une table HTML pour afficher les dépenses similaires
     * @param {Array} expenses - Liste des dépenses à afficher
     */
    UI.createExpensesTable = function(expenses) {
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
            
            // Cellule du marchand avec le nouveau format amélioré
            const merchantCell = document.createElement('td');
            if (expense.renamed_merchant && expense.original_merchant) {
                // Format amélioré pour afficher le marchand original et renommé
                merchantCell.innerHTML = `
                    <div class="original-merchant">${expense.original_merchant}</div>
                    <div class="renamed-merchant"><small><em>Renommé en: ${expense.merchant}</em></small></div>
                `;
            } else {
                merchantCell.textContent = expense.merchant;
            }
            row.appendChild(merchantCell);
            
            // Cellule du montant
            const amountCell = document.createElement('td');
            amountCell.textContent = `${expense.is_debit ? '-' : ''}${expense.amount.toFixed(2)} €`;
            amountCell.className = expense.is_debit ? 'text-danger' : 'text-success';
            row.appendChild(amountCell);
            
            // Cellule de statut
            if (expense.conflict) {
                // Badge avec croix rouge pour les conflits
                const statusCell = document.createElement('td');
                statusCell.className = 'text-center';
                statusCell.innerHTML = `
                    <span class="badge bg-danger conflict-badge" 
                        data-bs-toggle="tooltip" 
                        data-rule-id="${expense.conflict.rule_id}"
                        data-tooltip="<strong>Conflit</strong><br>Cette dépense est déjà affectée par la règle:<br><strong>${expense.conflict.rule_name}</strong><br>Cliquez pour plus de détails">
                        <i class="fas fa-times"></i>
                    </span>
                `;
                row.appendChild(statusCell);
            } else {
                // Badge vert avec coche pour les dépenses sans conflit
                const statusCell = document.createElement('td');
                statusCell.className = 'text-center';
                statusCell.innerHTML = `
                    <span class="badge bg-success">
                        <i class="fas fa-check"></i>
                    </span>
                `;
                row.appendChild(statusCell);
            }
            
            tbody.appendChild(row);
        });
        
        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        
        similarExpensesContainer.appendChild(tableContainer);
        
        // Initialiser les tooltips et badges de conflit
        setTimeout(() => {
            UI.initConflictIndicators();
        }, 100);
    };
})();