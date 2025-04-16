// app/static/js/tricount/reimbursements.js

/**
 * Script pour gérer la page de suivi des remboursements dans Tricount Helper
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les tooltips
    initTooltips();
    
    // Initialiser les filtres AJAX
    initAjaxFilters();
    
    // Initialiser les switches de statut
    initStatusSwitches();
    
    // Initialiser les fonctionnalités de sélection en masse
    initBulkSelection();
    
    // Initialiser le bouton d'export
    initExportButton();
    
    // Initialiser la pagination AJAX
    initAjaxPagination();
    
    /**
     * Initialise les tooltips Bootstrap
     */
    function initTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    /**
     * Initialise la pagination AJAX
     */
    function initAjaxPagination() {
        const paginationLinks = document.querySelectorAll('#pagination .page-link:not(.disabled)');
        
        paginationLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Récupérer la page demandée
                const page = this.dataset.page || '1';
                
                // Mettre à jour le champ caché de page du formulaire
                const pageInput = document.createElement('input');
                pageInput.type = 'hidden';
                pageInput.name = 'page';
                pageInput.value = page;
                
                const filterForm = document.getElementById('filter-form');
                
                // Supprimer l'ancien input de page s'il existe
                const oldPageInput = filterForm.querySelector('input[name="page"]');
                if (oldPageInput) {
                    filterForm.removeChild(oldPageInput);
                }
                
                // Ajouter le nouvel input
                filterForm.appendChild(pageInput);
                
                // Déclencher une soumission AJAX
                submitFiltersAjax();
            });
        });
    }
    
    /**
     * Initialise les filtres en mode AJAX
     */
    function initAjaxFilters() {
        const filterForm = document.getElementById('filter-form');
        if (!filterForm || !filterForm.dataset.ajaxFilter) return;
        
        // Récupérer tous les éléments de filtrage
        const filterInputs = filterForm.querySelectorAll('input, select');
        const resetButton = document.getElementById('reset-filters-btn');
        const resetFilterLink = document.getElementById('reset-filters-link');
        let filterTimeout = null;
        
        // Ajouter des écouteurs à tous les éléments de filtrage
        filterInputs.forEach(input => {
            const eventType = input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input';
            
            input.addEventListener(eventType, function() {
                // Annuler le timeout précédent
                if (filterTimeout) {
                    clearTimeout(filterTimeout);
                }
                
                // Montrer l'indicateur de chargement
                document.getElementById('table-loading-spinner').style.display = 'block';
                
                // Définir un nouveau timeout pour éviter trop de requêtes
                filterTimeout = setTimeout(() => {
                    submitFiltersAjax();
                }, 500);
            });
        });
        
        // Gérer le bouton de réinitialisation
        if (resetButton) {
            resetButton.addEventListener('click', function(e) {
                e.preventDefault();
                resetFilters();
            });
        }
        
        if (resetFilterLink) {
            resetFilterLink.addEventListener('click', function(e) {
                e.preventDefault();
                resetFilters();
            });
        }
        
        // Empêcher la soumission normale du formulaire
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitFiltersAjax();
        });
    }
    
    /**
     * Réinitialise tous les filtres et soumet le formulaire
     */
    function resetFilters() {
        const filterForm = document.getElementById('filter-form');
        
        // Réinitialiser tous les champs à leurs valeurs par défaut
        filterForm.reset();
        
        // Cocher tous les statuts par défaut
        document.getElementById('status-not-declared').checked = true;
        document.getElementById('status-declared').checked = true;
        document.getElementById('status-reimbursed').checked = true;
        
        // Soumettre le formulaire avec AJAX
        submitFiltersAjax();
    }
    
        /**
     * Soumet le formulaire de filtrage via AJAX
     */
    function submitFiltersAjax() {
        const filterForm = document.getElementById('filter-form');
        const tableBody = document.getElementById('expenses-table-body');
        const loadingSpinner = document.getElementById('table-loading-spinner');
        
        // Afficher l'indicateur de chargement
        if (loadingSpinner) {
            loadingSpinner.style.display = 'block';
        }
        
        // Récupérer les données du formulaire
        const formData = new FormData(filterForm);
        formData.append('ajax', 'true');
        
        // S'assurer que les statuts sont correctement traités
        // Supprimer d'abord tous les statuts du formData
        for (const pair of [...formData.entries()]) {
            if (pair[0] === 'status[]') {
                formData.delete(pair[0]);
            }
        }
        
        // Puis ajouter uniquement les statuts sélectionnés
        const statusSwitches = document.querySelectorAll('.filter-status-switch:checked');
        statusSwitches.forEach(switchEl => {
            formData.append('status', switchEl.value);
        });
        
        // Convertir les données en paramètres d'URL
        const params = new URLSearchParams(formData);
        
        // Envoyer la requête AJAX
        fetch(`${filterForm.action}?${params.toString()}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Mettre à jour le contenu du tableau
                updateTableContent(data.expenses);
                
                // Mettre à jour les statistiques
                updateSummary(data.summary);
                
                // Mettre à jour la pagination
                updatePagination(data.pagination);
                
                // Mettre à jour l'URL sans recharger la page
                window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
            } else {
                console.error('Erreur lors du chargement des dépenses:', data.error);
                showErrorMessage('Erreur lors du chargement des dépenses. Veuillez réessayer.');
            }
        })
        .catch(error => {
            console.error('Erreur AJAX:', error);
            showErrorMessage('Erreur de communication avec le serveur.');
        })
        .finally(() => {
            // Masquer l'indicateur de chargement
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        });
    }
    
    /**
     * Met à jour le contenu du tableau avec les nouvelles dépenses
     * @param {Array} expenses - Liste des dépenses
     */
    function updateTableContent(expenses) {
        const tableBody = document.getElementById('expenses-table-body');
        
        // Vider le contenu actuel
        tableBody.innerHTML = '';
        
        // Mettre à jour le compteur de dépenses
        document.getElementById('expenses-count').textContent = `${expenses.length} dépenses`;
        
        // Ajouter les nouvelles lignes
        if (expenses.length === 0) {
            // Aucune dépense à afficher
            tableBody.innerHTML = `
                <tr id="no-expenses-row">
                    <td colspan="7" class="text-center py-4">
                        <div class="alert alert-info mb-0">
                            <i class="fas fa-info-circle me-2"></i>
                            Aucune dépense remboursable trouvée avec les filtres appliqués. 
                            <a href="#" class="reset-filters-link">Réinitialiser les filtres</a>.
                        </div>
                    </td>
                </tr>
            `;
            
            // Initialiser le lien de réinitialisation
            const resetLink = tableBody.querySelector('.reset-filters-link');
            if (resetLink) {
                resetLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    resetFilters();
                });
            }
            
            return;
        }
        
        // Créer les lignes pour chaque dépense
        expenses.forEach(expense => {
            const row = document.createElement('tr');
            row.dataset.expenseId = expense.id;
            
            // Ajouter des classes pour le style selon le statut
            if (expense.is_declared) row.classList.add('expense-declared');
            if (expense.is_reimbursed) row.classList.add('expense-reimbursed');
            
            // Générer le HTML de la ligne
            row.innerHTML = `
                <td>
                    <div class="form-check">
                        <input class="form-check-input expense-checkbox" type="checkbox" value="${expense.id}">
                    </div>
                </td>
                <td>${expense.date}</td>
                <td class="description-cell">
                    <div class="fw-bold">${expense.merchant}</div>
                    <div class="small text-muted">${expense.description || ''}</div>
                </td>
                <td class="text-danger">
                    ${expense.amount.toFixed(2)} €
                </td>
                <td>${expense.flag_html || '<span class="badge bg-secondary">Non défini</span>'}</td>
                <td>
                    <div class="form-check form-switch">
                        <input class="form-check-input status-switch declared-switch" 
                               type="checkbox" 
                               data-expense-id="${expense.id}" 
                               data-status="declared" 
                               ${expense.is_declared ? 'checked' : ''}>
                        <label class="form-check-label">Déclarée</label>
                    </div>
                </td>
                <td>
                    <div class="form-check form-switch">
                        <input class="form-check-input status-switch reimbursed-switch" 
                               type="checkbox" 
                               data-expense-id="${expense.id}" 
                               data-status="reimbursed" 
                               ${expense.is_reimbursed ? 'checked' : ''}>
                        <label class="form-check-label">Remboursée</label>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Réinitialiser les fonctionnalités des boutons et sélecteurs
        initStatusSwitches();
        initBulkSelection();
        initTooltips();
        
        // Réinitialiser le tri des tableaux
        if (window.TableSorter) {
            window.TableSorter.init();
        }
    }
    
    /**
     * Met à jour les statistiques du résumé
     * @param {Object} summary - Données de résumé
     */
    function updateSummary(summary) {
        document.getElementById('total-amount').textContent = `${summary.total_amount.toFixed(2)} €`;
        document.getElementById('total-declared').textContent = `${summary.total_declared.toFixed(2)} €`;
        document.getElementById('total-reimbursed').textContent = `${summary.total_reimbursed.toFixed(2)} €`;
        document.getElementById('percentage-declared').textContent = `${Math.round(summary.percentage_declared)}%`;
        
        // Mettre à jour le cercle de progression
        document.getElementById('progress-circle-bg').style.background = 
            `conic-gradient(#0d6efd ${summary.percentage_declared}%, #e9ecef 0)`;
    }
    
    /**
     * Met à jour la pagination
     * @param {Object} pagination - Données de pagination
     */
    function updatePagination(pagination) {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;
        
        // Si pas de pages, masquer la pagination
        if (pagination.pages <= 1) {
            document.getElementById('pagination-container').innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Bouton précédent
        if (pagination.has_prev) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${pagination.page - 1}">
                        <i class="fas fa-chevron-left"></i> Précédent
                    </a>
                </li>
            `;
        } else {
            html += `
                <li class="page-item disabled">
                    <span class="page-link"><i class="fas fa-chevron-left"></i> Précédent</span>
                </li>
            `;
        }
        
        // Calculer les pages à afficher
        let startPage = Math.max(pagination.page - 2, 1);
        let endPage = Math.min(startPage + 4, pagination.pages);
        startPage = Math.max(endPage - 4, 1);
        
        // Pages numérotées
        for (let i = startPage; i <= endPage; i++) {
            if (i === pagination.page) {
                html += `
                    <li class="page-item active">
                        <span class="page-link">${i}</span>
                    </li>
                `;
            } else {
                html += `
                    <li class="page-item">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            }
        }
        
        // Bouton suivant
        if (pagination.has_next) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${pagination.page + 1}">
                        Suivant <i class="fas fa-chevron-right"></i>
                    </a>
                </li>
            `;
        } else {
            html += `
                <li class="page-item disabled">
                    <span class="page-link">Suivant <i class="fas fa-chevron-right"></i></span>
                </li>
            `;
        }
        
        // Mettre à jour le HTML
        paginationContainer.innerHTML = html;
        
        // Initialiser les liens de pagination
        initAjaxPagination();
    }
    
    /**
     * Affiche un message d'erreur
     * @param {string} message - Message d'erreur à afficher
     */
    function showErrorMessage(message) {
        const tableBody = document.getElementById('expenses-table-body');
        
        // Créer une alerte d'erreur
        const alertHtml = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="alert alert-danger mb-0">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        ${message}
                    </div>
                </td>
            </tr>
        `;
        
        tableBody.innerHTML = alertHtml;
    }
    
    /**
     * Initialise les switches de statut
     */
    function initStatusSwitches() {
        const statusSwitches = document.querySelectorAll('.status-switch');
        
        statusSwitches.forEach(statusSwitch => {
            // Supprimer les anciens écouteurs pour éviter les duplications
            statusSwitch.removeEventListener('change', handleStatusSwitchChange);
            
            // Ajouter le nouvel écouteur
            statusSwitch.addEventListener('change', handleStatusSwitchChange);
        });
    }
    
    /**
     * Gère le changement d'état d'un switch de statut
     */
    function handleStatusSwitchChange() {
        const expenseId = this.dataset.expenseId;
        const status = this.dataset.status;
        const isChecked = this.checked;
        const row = document.querySelector(`tr[data-expense-id="${expenseId}"]`);
        
        // Gérer la dépendance entre déclaré et remboursé
        if (status === 'reimbursed' && isChecked) {
            // Si on coche remboursé, il faut aussi cocher déclaré
            const declaredSwitch = row.querySelector('.declared-switch');
            if (declaredSwitch && !declaredSwitch.checked) {
                declaredSwitch.checked = true;
            }
        } else if (status === 'declared' && !isChecked) {
            // Si on décoche déclaré, il faut aussi décocher remboursé
            const reimbursedSwitch = row.querySelector('.reimbursed-switch');
            if (reimbursedSwitch && reimbursedSwitch.checked) {
                reimbursedSwitch.checked = false;
            }
        }
        
        // Déterminer le nouveau statut
        let newStatus;
        const declaredChecked = row.querySelector('.declared-switch').checked;
        const reimbursedChecked = row.querySelector('.reimbursed-switch').checked;
        
        if (reimbursedChecked) {
            newStatus = 'reimbursed';
        } else if (declaredChecked) {
            newStatus = 'declared';
        } else {
            newStatus = 'not_declared';
        }
        
        // Mettre à jour le statut via AJAX
        updateExpenseStatus(expenseId, newStatus, row);
    }
    
    /**
     * Met à jour le statut d'une dépense via AJAX
     * @param {number} expenseId - ID de la dépense
     * @param {string} status - Nouveau statut
     * @param {HTMLElement} row - Élément TR de la dépense
     */
    function updateExpenseStatus(expenseId, status, row) {
        // Ajouter une classe pour indiquer le chargement
        row.classList.add('status-updating');
        
        // Créer les données de la requête
        const formData = new FormData();
        formData.append('status', status);
        
        // Envoyer la requête AJAX
        fetch(`/tricount/reimbursements/update/${expenseId}`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Mettre à jour les classes de la ligne selon le nouveau statut
                row.classList.remove('expense-declared', 'expense-reimbursed');
                
                if (status === 'declared') {
                    row.classList.add('expense-declared');
                } else if (status === 'reimbursed') {
                    row.classList.add('expense-declared', 'expense-reimbursed');
                }
                
                // Ajouter une animation pour montrer que le statut a été mis à jour
                row.classList.add('status-updated');
                setTimeout(() => {
                    row.classList.remove('status-updated');
                }, 2000);
                
                // Vérifier si la ligne devrait être masquée en fonction des filtres actuels
                checkRowVisibility(row);
                
                // Actualiser les statistiques - optionnel, nécessite une requête AJAX supplémentaire
                // fetchAndUpdateSummary();
            } else {
                // Afficher une erreur
                console.error('Erreur lors de la mise à jour du statut:', data.error);
                alert('Erreur lors de la mise à jour du statut: ' + (data.error || 'Erreur inconnue'));
                
                // Restaurer l'état précédent des switches
                restoreSwitchesState(row, status);
            }
        })
        .catch(error => {
            console.error('Erreur AJAX:', error);
            alert('Erreur de communication avec le serveur.');
            
            // Restaurer l'état précédent des switches
            restoreSwitchesState(row, status);
        })
        .finally(() => {
            // Supprimer la classe de chargement
            row.classList.remove('status-updating');
        });
    }
    
    /**
     * Restaure l'état des switches en cas d'erreur
     * @param {HTMLElement} row - Élément TR de la dépense
     * @param {string} failedStatus - Statut qui a échoué
     */
    function restoreSwitchesState(row, failedStatus) {
        const declaredSwitch = row.querySelector('.declared-switch');
        const reimbursedSwitch = row.querySelector('.reimbursed-switch');
        
        // Restaurer l'état des switches selon les classes de la ligne
        if (row.classList.contains('expense-reimbursed')) {
            if (declaredSwitch) declaredSwitch.checked = true;
            if (reimbursedSwitch) reimbursedSwitch.checked = true;
        } else if (row.classList.contains('expense-declared')) {
            if (declaredSwitch) declaredSwitch.checked = true;
            if (reimbursedSwitch) reimbursedSwitch.checked = false;
        } else {
            if (declaredSwitch) declaredSwitch.checked = false;
            if (reimbursedSwitch) reimbursedSwitch.checked = false;
        }
    }
    
    /**
     * Vérifie si une ligne doit être visible en fonction des filtres actuels
     * @param {HTMLElement} row - Élément TR de la dépense
     */
    function checkRowVisibility(row) {
        // Récupérer les statuts filtrés
        const statusFilters = Array.from(document.querySelectorAll('.filter-status-switch:checked'))
            .map(checkbox => checkbox.value);
        
        // Si aucun filtre actif, cacher toutes les lignes
        if (statusFilters.length === 0) {
            hideRow(row);
            return;
        }
        
        // Déterminer le statut de la ligne
        let rowStatus;
        if (row.classList.contains('expense-reimbursed')) {
            rowStatus = 'reimbursed';
        } else if (row.classList.contains('expense-declared')) {
            rowStatus = 'declared';
        } else {
            rowStatus = 'not_declared';
        }
        
        // Vérifier si le statut de la ligne correspond aux filtres
        const visible = statusFilters.includes(rowStatus);
        
        if (!visible) {
            hideRow(row);
        }
    }
    
    /**
     * Cache une ligne avec une animation
     * @param {HTMLElement} row - La ligne à cacher
     */
    function hideRow(row) {
        // Animer la disparition et supprimer la ligne
        row.style.transition = 'opacity 0.5s ease, height 0.5s ease';
        row.style.opacity = '0';
        row.style.height = '0';
        row.style.overflow = 'hidden';
        
        setTimeout(() => {
            row.remove();
            
            // Mettre à jour le compteur de résultats
            const totalRows = document.querySelectorAll('#expenses-table-body tr:not([style*="height: 0"])').length;
            document.getElementById('expenses-count').textContent = `${totalRows} dépenses`;
            
            // Afficher un message si plus aucune dépense
            if (totalRows === 0) {
                const tableBody = document.getElementById('expenses-table-body');
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4">
                            <div class="alert alert-info mb-0">
                                <i class="fas fa-info-circle me-2"></i>
                                Aucune dépense remboursable trouvée avec les filtres appliqués. 
                                <a href="#" class="reset-filters-link">Réinitialiser les filtres</a>.
                            </div>
                        </td>
                    </tr>
                `;
                
                // Initialiser le lien de réinitialisation
                const resetLink = tableBody.querySelector('.reset-filters-link');
                if (resetLink) {
                    resetLink.addEventListener('click', function(e) {
                        e.preventDefault();
                        resetFilters();
                    });
                }
            }
        }, 500);
    }
    
    /**
     * Récupère et met à jour les statistiques de résumé
     */
    function fetchAndUpdateSummary() {
        // Cette fonction pourrait être appelée après la mise à jour d'une dépense
        // pour actualiser les statistiques sans recharger toute la page
        fetch('/tricount/reimbursements/summary', {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateSummary(data.summary);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des statistiques:', error);
        });
    }
    
    /**
     * Initialise les fonctionnalités de sélection en masse
     */
    function initBulkSelection() {
        const selectAllCheckbox = document.getElementById('select-all-expenses');
        const expenseCheckboxes = document.querySelectorAll('.expense-checkbox');
        const bulkDeclareBtn = document.getElementById('bulk-declare-btn');
        const selectedCountSpan = document.getElementById('selected-count');
        const confirmBulkBtn = document.getElementById('confirm-bulk-declare');
        
        if (!selectAllCheckbox || !bulkDeclareBtn) return;
        
        // Réinitialiser l'état du checkbox "Tout sélectionner"
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        
        // Fonction pour mettre à jour le compteur
        function updateSelectedCount() {
            const selectedCount = document.querySelectorAll('.expense-checkbox:checked').length;
            
            if (selectedCountSpan) {
                selectedCountSpan.textContent = selectedCount;
            }
            
            // Activer/désactiver le bouton selon la sélection
            if (bulkDeclareBtn) {
                if (selectedCount > 0) {
                    bulkDeclareBtn.textContent = `Déclarer la sélection (${selectedCount})`;
                    bulkDeclareBtn.disabled = false;
                } else {
                    bulkDeclareBtn.textContent = 'Déclarer la sélection';
                    bulkDeclareBtn.disabled = true;
                }
            }
        }
        
        // Sélectionner/désélectionner toutes les dépenses
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            
            expenseCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
                
                // Mise à jour de l'apparence de la ligne
                const row = checkbox.closest('tr');
                if (row) {
                    if (isChecked) {
                        row.classList.add('selected');
                    } else {
                        row.classList.remove('selected');
                    }
                }
            });
            
            updateSelectedCount();
        });
        
        // Gérer le changement d'état des checkboxes individuels
        expenseCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const row = this.closest('tr');
                if (row) {
                    if (this.checked) {
                        row.classList.add('selected');
                    } else {
                        row.classList.remove('selected');
                    }
                }
                
                updateSelectedCount();
                updateSelectAllState();
            });
        });
        
        // Mettre à jour l'état du checkbox "Tout sélectionner"
        function updateSelectAllState() {
            const totalCheckboxes = expenseCheckboxes.length;
            const checkedCount = document.querySelectorAll('.expense-checkbox:checked').length;
            
            if (checkedCount === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (checkedCount === totalCheckboxes) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.indeterminate = true;
            }
        }
        
        // Gérer le bouton de déclaration en masse
        bulkDeclareBtn.addEventListener('click', function() {
            const selectedCount = document.querySelectorAll('.expense-checkbox:checked').length;
            
            if (selectedCount === 0) {
                alert('Veuillez sélectionner au moins une dépense.');
                return;
            }
            
            // Mettre à jour le compteur dans la modal
            if (selectedCountSpan) {
                selectedCountSpan.textContent = selectedCount;
            }
            
            // Ouvrir la modal
            const bulkDeclareModal = new bootstrap.Modal(document.getElementById('bulkDeclareModal'));
            bulkDeclareModal.show();
        });
        
        // Gérer les dépendances entre les switches de statut dans la modal
        const bulkDeclaredSwitch = document.getElementById('bulk-declared');
        const bulkReimbursedSwitch = document.getElementById('bulk-reimbursed');
        
        if (bulkDeclaredSwitch && bulkReimbursedSwitch) {
            bulkReimbursedSwitch.addEventListener('change', function() {
                if (this.checked && !bulkDeclaredSwitch.checked) {
                    bulkDeclaredSwitch.checked = true;
                }
            });
            
            bulkDeclaredSwitch.addEventListener('change', function() {
                if (!this.checked && bulkReimbursedSwitch.checked) {
                    bulkReimbursedSwitch.checked = false;
                }
            });
        }
        
        // Confirmer la modification en masse
        if (confirmBulkBtn) {
            confirmBulkBtn.addEventListener('click', function() {
                // Récupérer les IDs des dépenses sélectionnées
                const selectedIds = Array.from(document.querySelectorAll('.expense-checkbox:checked'))
                    .map(checkbox => checkbox.value);
                
                // Récupérer le statut à appliquer
                const declaredChecked = document.getElementById('bulk-declared').checked;
                const reimbursedChecked = document.getElementById('bulk-reimbursed').checked;
                
                let status;
                if (reimbursedChecked) {
                    status = 'reimbursed';
                } else if (declaredChecked) {
                    status = 'declared';
                } else {
                    status = 'not_declared';
                }
                
                // Afficher un indicateur de chargement
                confirmBulkBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Traitement...';
                confirmBulkBtn.disabled = true;
                
                // Appeler l'API pour mettre à jour les statuts
                fetch('/tricount/reimbursements/bulk-update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        expense_ids: selectedIds,
                        status: status
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Fermer la modal
                        bootstrap.Modal.getInstance(document.getElementById('bulkDeclareModal')).hide();
                        
                        // Afficher un message de succès
                        alert(`${data.updated} dépenses mises à jour avec succès. ${data.skipped} dépenses ignorées.`);
                        
                        // Recharger les données via AJAX
                        submitFiltersAjax();
                    } else {
                        alert('Erreur lors de la mise à jour: ' + (data.error || 'Erreur inconnue'));
                        confirmBulkBtn.innerHTML = 'Confirmer';
                        confirmBulkBtn.disabled = false;
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Erreur de communication avec le serveur.');
                    confirmBulkBtn.innerHTML = 'Confirmer';
                    confirmBulkBtn.disabled = false;
                });
            });
        }
    }
    
    /**
     * Initialise le bouton d'export
     */
    function initExportButton() {
        const exportBtn = document.getElementById('export-btn');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                // À implémenter dans une version future
                alert('La fonctionnalité d\'export sera disponible prochainement.');
            });
        }
    }
});