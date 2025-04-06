// app/static/js/tricount/auto_categorize/ui.js

// Ajouter/modifier ces fonctions pour améliorer la gestion des conflits

/**
 * Initialise les indicateurs de conflit sur les dépenses
 */
AutoCategorize.UI.initConflictIndicators = function() {
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
            
            AutoCategorize.UI.showConflictDetails(expenseId, ruleId);
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
AutoCategorize.UI.createStatusCell = function(expense) {
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
AutoCategorize.UI.showConflictDetails = function(expenseId, ruleId) {
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

// Modifier le code qui crée la table des dépenses similaires
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
        
        // Cellule de statut avec HTML personnalisé
        const statusCell = document.createElement('td');
        statusCell.className = 'text-center';
        
        if (expense.conflict) {
            statusCell.innerHTML = `
                <span class="badge bg-danger conflict-badge" 
                      data-bs-toggle="tooltip" 
                      data-rule-id="${expense.conflict.rule_id}"
                      data-tooltip="<strong>Conflit</strong><br>Cette dépense est déjà affectée par la règle:<br><strong>${expense.conflict.rule_name}</strong><br>Cliquez pour plus de détails">
                    <i class="fas fa-times"></i>
                </span>
            `;
        } else {
            statusCell.innerHTML = `
                <span class="badge bg-success">
                    <i class="fas fa-check"></i>
                </span>
            `;
        }
        
        row.appendChild(statusCell);
        tbody.appendChild(row);
    });
    
    table.appendChild(thead);
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    
    similarExpensesContainer.appendChild(tableContainer);
    
    // Initialiser les tooltips et badges de conflit
    setTimeout(() => {
        AutoCategorize.UI.initConflictIndicators();
    }, 100);
};

// Modifier la fonction init pour initialiser tout ce qui est lié aux conflits
AutoCategorize.UI.init = function() {
    // Initialiser le bouton de rafraîchissement
    const refreshButton = document.getElementById('refresh-similar-expenses');
    if (refreshButton) {
        refreshButton.addEventListener('click', AutoCategorize.UI.refreshSimilarExpenses);
    }
    
    // Initialiser les badges de conflit
    AutoCategorize.UI.initConflictIndicators();
};