// app/static/js/tricount/auto_categorize/core.js

/**
 * Module principal de la fonctionnalité auto-catégorisation
 * Point d'entrée qui initialise tous les autres modules
 */

// Fonction d'initialisation principale
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing AutoCategorize modules...");
    
    // S'assurer que l'objet global existe avec toutes les propriétés nécessaires
    window.AutoCategorize = window.AutoCategorize || {};
    
    // Initialiser les composants dans le bon ordre
    // 1. D'abord les filtres qui sont utilisés par d'autres modules
    if (typeof AutoCategorize.initFilters === 'function') {
        console.log("Initializing filters...");
        AutoCategorize.initFilters();
    }
    
    // 2. Les associations entre les flags et les catégories
    if (typeof AutoCategorize.initFlagAndCategory === 'function') {
        console.log("Initializing flag and category relationships...");
        AutoCategorize.initFlagAndCategory();
    }
    
    // 3. Les sections d'action (Catégorie, Flag, Renommage)
    if (typeof AutoCategorize.initActionSections === 'function') {
        console.log("Initializing action sections...");
        AutoCategorize.initActionSections();
    }
    
    // 4. La prévisualisation de renommage
    if (typeof AutoCategorize.initRename === 'function') {
        console.log("Initializing rename preview...");
        AutoCategorize.initRename();
    }
    
    // 5. L'interface utilisateur et les rafraîchissements
    if (typeof AutoCategorize.UI !== 'undefined' && typeof AutoCategorize.UI.init === 'function') {
        console.log("Initializing UI components...");
        AutoCategorize.UI.init();
    }
    
    // 6. La validation du formulaire (nouveau module)
    if (typeof AutoCategorize.Validation !== 'undefined' && typeof AutoCategorize.Validation.init === 'function') {
        console.log("Initializing form validation...");
        AutoCategorize.Validation.init();
    }
    
    console.log("All AutoCategorize modules initialized.");

    document.addEventListener('DOMContentLoaded', function() {
        // Initialiser les boutons de basculement des détails
        const toggleButtons = document.querySelectorAll('.btn-toggle-details');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', function() {
                const icon = this.querySelector('i');
                const targetId = this.getAttribute('data-bs-target');
                const isExpanded = this.getAttribute('aria-expanded') === 'true';
                
                // Mise à jour dynamique du texte et de l'icône
                if (isExpanded) {
                    this.innerHTML = '<i class="fas fa-ellipsis-h"></i> Voir description';
                } else {
                    this.innerHTML = '<i class="fas fa-chevron-up"></i> Masquer description';
                }
            });
        });
        
        // Mettre à jour le comportement de createExpensesTable pour préserver le format
        if (window.AutoCategorize && window.AutoCategorize.UI && window.AutoCategorize.UI.createExpensesTable) {
            const originalCreateExpensesTable = window.AutoCategorize.UI.createExpensesTable;
            
            window.AutoCategorize.UI.createExpensesTable = function(expenses) {
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
                        <th>Détails</th>
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
                    dateCell.className = 'text-nowrap';
                    dateCell.textContent = expense.date;
                    row.appendChild(dateCell);
                    
                    // Cellule des détails (marchand + description)
                    const detailsCell = document.createElement('td');
                    
                    // Contenu structuré pour les détails
                    let detailsHTML = `
                        <div class="expense-details">
                            <div class="merchant-info mb-1">
                                <div class="original-merchant fw-bold">
                                    ${expense.merchant}
                                    ${!expense.renamed_merchant ? '<span class="badge bg-secondary rounded-pill ms-1 fs-8">Original</span>' : ''}
                                </div>`;
                    
                    // Ajouter le marchand renommé s'il existe
                    if (expense.renamed_merchant) {
                        detailsHTML += `
                                <div class="renamed-merchant small text-primary">
                                    <i class="fas fa-tag me-1"></i>Renommé: ${expense.renamed_merchant}
                                </div>`;
                    }
                    
                    detailsHTML += `</div>
                            
                            <!-- Bouton pour afficher/masquer les détails de description -->
                            <button class="btn btn-sm btn-outline-secondary btn-toggle-details py-0 px-1" type="button" 
                                    data-bs-toggle="collapse" data-bs-target="#details-${expense.id}" 
                                    aria-expanded="false" aria-controls="details-${expense.id}">
                                <i class="fas fa-ellipsis-h"></i> Voir description
                            </button>
                            
                            <!-- Détails de description (collapsible) -->
                            <div class="collapse mt-2" id="details-${expense.id}">
                                <div class="card card-body py-2 px-3 bg-light">
                                    <div class="description-info">
                                        <div class="original-description small">
                                            <span class="fw-bold">Description:</span> ${expense.description || 'Non disponible'}
                                        </div>`;
                    
                    // Ajouter les notes si elles existent
                    if (expense.notes) {
                        detailsHTML += `
                                        <div class="modified-description small text-success mt-1">
                                            <span class="fw-bold"><i class="fas fa-edit me-1"></i>Notes:</span> ${expense.notes}
                                        </div>`;
                    }
                    
                    detailsHTML += `
                                    </div>
                                </div>
                            </div>
                        </div>`;
                    
                    detailsCell.innerHTML = detailsHTML;
                    row.appendChild(detailsCell);
                    
                    // Cellule du montant
                    const amountCell = document.createElement('td');
                    amountCell.className = `text-nowrap ${expense.is_debit ? 'text-danger' : 'text-success'}`;
                    amountCell.textContent = `${expense.is_debit ? '-' : ''}${expense.amount.toFixed(2)} €`;
                    row.appendChild(amountCell);
                    
                    // Créer la cellule de statut en utilisant la méthode dédiée
                    const statusCellHtml = window.AutoCategorize.UI.createStatusCell(expense);
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = statusCellHtml;
                    while (tempDiv.firstChild) {
                        row.appendChild(tempDiv.firstChild);
                    }
                    
                    tbody.appendChild(row);
                });
                
                table.appendChild(thead);
                table.appendChild(tbody);
                tableContainer.appendChild(table);
                
                similarExpensesContainer.appendChild(tableContainer);
                
                // Initialiser les tooltips et badges de conflit
                setTimeout(() => {
                    initToggleButtons();
                    window.AutoCategorize.UI.initConflictIndicators();
                }, 100);
            };
        }
        
        // Fonction pour initialiser les boutons de basculement
        function initToggleButtons() {
            const toggleButtons = document.querySelectorAll('.btn-toggle-details');
            
            toggleButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const targetId = this.getAttribute('data-bs-target');
                    const isExpanded = this.getAttribute('aria-expanded') === 'true';
                    
                    // Mise à jour dynamique du texte et de l'icône
                    if (isExpanded) {
                        this.innerHTML = '<i class="fas fa-ellipsis-h"></i> Voir description';
                    } else {
                        this.innerHTML = '<i class="fas fa-chevron-up"></i> Masquer description';
                    }
                });
            });
        }
        
        // Initialiser immédiatement
        initToggleButtons();
    });
});