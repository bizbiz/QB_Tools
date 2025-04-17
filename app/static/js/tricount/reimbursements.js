/**
 * Reconfigure les filtres pour qu'ils restent dans l'état demandé
 * sans causer de rechargement de page complet
 */
function preventFormDefaults() {
    // Désactiver les comportements par défaut des boutons de formulaire
    document.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            return false;
        });
    });
    
    // Désactiver les comportements par défaut des filtres
    document.querySelectorAll('#filter-form select, #filter-form input[type="date"]').forEach(element => {
        element.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // Empêcher que le changement de date remonte la page
        if (element.type === 'date') {
            element.addEventListener('focus', function(e) {
                e.preventDefault();
                e.stopPropagation();
            });
            
            element.addEventListener('change', function(e) {
                e.preventDefault();
                e.stopPropagation();
            });
        }
    });
}// app/static/js/tricount/reimbursements.js

/**
 * Script pour gérer la page de suivi des remboursements dans Tricount Helper
 */
document.addEventListener('DOMContentLoaded', function() {
    // Désactiver certains comportements natifs qui causent des rafraîchissements
    disableNativeFormBehaviors();
    
    // Initialiser les tooltips
    initTooltips();
    
    // Prévenir les comportements par défaut des formulaires
    preventFormDefaults();
    
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
    
    // Initialiser les fonctionnalités d'édition de dépense
    initExpenseEdit();
    
    // Initialiser la consultation détaillée
    initExpenseView();
    
    /**
     * Désactive les comportements qui causent des rafraîchissements
     */
    function disableNativeFormBehaviors() {
        // Remplacer le gestionnaire de submit natif du navigateur
        document.querySelectorAll('form').forEach(form => {
            form.onsubmit = function(e) {
                e.preventDefault();
                return false;
            };
        });
        
        // Empêcher les clics sur les liens de reload
        document.querySelectorAll('a[href="#"]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                return false;
            });
        });
        
        // Empêcher le mécanisme de submit du formulaire
        document.addEventListener('keydown', function(e) {
            if ((e.keyCode === 13 || e.key === 'Enter') && 
                (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
                e.preventDefault();
                return false;
            }
        }, true);
    }
    
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
                
                return false;
            });
        });
    }
    
    /**
     * Reconfigure les filtres pour qu'ils restent dans l'état demandé
     * sans causer de rechargement de page complet
     */
    function preventFormDefaults() {
        // Désactiver les comportements par défaut des boutons de formulaire
        document.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                return false;
            });
        });
        
        // Désactiver les comportements par défaut des filtres
        document.querySelectorAll('#filter-form select, #filter-form input[type="date"]').forEach(element => {
            element.addEventListener('click', function(e) {
                e.stopPropagation();
            });
            
            // Empêcher que le changement de date remonte la page
            if (element.type === 'date') {
                element.addEventListener('focus', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
                
                element.addEventListener('change', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
            }
        });
    }
    
    /**
     * Initialise les filtres en mode AJAX
     */
    function initAjaxFilters() {
        const filterForm = document.getElementById('filter-form');
        if (!filterForm || !filterForm.dataset.ajaxFilter) return;
        
        // Capture directe des événements pour empêcher le comportement par défaut
        // Plutôt que d'utiliser les écouteurs d'événements natifs
        
        // Sélecteurs 
        document.getElementById('flag_id').onchange = function(e) {
            e.preventDefault();
            e.stopPropagation();
            triggerFilter();
            return false;
        };
        
        // Champs de statut
        document.querySelectorAll('.filter-status-switch').forEach(checkbox => {
            checkbox.onchange = function(e) {
                e.preventDefault();
                e.stopPropagation();
                triggerFilter();
                return false;
            };
        });
        
        // Champ de recherche
        document.getElementById('search').oninput = function(e) {
            e.preventDefault();
            e.stopPropagation();
            triggerFilter();
            return false;
        };
        
        // Champs de date
        const dateFields = ['start_date', 'end_date'];
        dateFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.onchange = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerFilter();
                    return false;
                };
            }
        });
        
        // Lien et bouton de réinitialisation
        document.getElementById('reset-filters-btn').onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            resetFilters();
            return false;
        };
        
        const resetLink = document.getElementById('reset-filters-link');
        if (resetLink) {
            resetLink.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                resetFilters();
                return false;
            };
        }
        
        // Empêcher la soumission normale du formulaire
        filterForm.onsubmit = function(e) {
            e.preventDefault();
            e.stopPropagation();
            submitFiltersAjax();
            return false;
        };
        
        // Fonction pour déclencher le filtrage avec un délai
        let filterTimeout = null;
        function triggerFilter() {
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
        }
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
        
        // Enregistrer la position de défilement actuelle
        const scrollPosition = window.scrollY || window.pageYOffset;
        
        // Afficher l'indicateur de chargement
        if (loadingSpinner) {
            loadingSpinner.style.display = 'block';
        }
        
        // Créer directement un FormData pour capturer tous les champs
        const formData = new FormData(filterForm);
        formData.append('ajax', 'true');
        
        // Envoyer la requête AJAX avec POST au lieu de GET
        fetch(filterForm.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Mettre à jour le tableau avec les nouvelles données
                updateTableContent(data.expenses);
                
                // Mettre à jour les statistiques
                updateSummary(data.summary);
                
                // Mettre à jour la pagination
                if (data.pagination) {
                    updatePagination(data.pagination);
                }
                
                // Restaurer la position de défilement
                setTimeout(() => {
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'instant' // Utiliser 'auto' pour IE ou si 'instant' n'est pas supporté
                    });
                }, 10);
            } else {
                showErrorMessage(data.error || 'Une erreur est survenue lors du chargement des données.');
            }
        })
        .catch(error => {
            console.error('Erreur AJAX:', error);
            showErrorMessage('Erreur de communication avec le serveur.');
        })
        .finally(() => {
            // Cacher l'indicateur de chargement
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
                    <td colspan="8" class="text-center py-4">
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
            
            // Afficher le montant en rouge pour les dépenses (débit)
            const amountClass = expense.is_debit ? 'text-danger' : 'text-success';
            const amountPrefix = expense.is_debit ? '' : '+';
            
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
                <td class="${amountClass}">
                    ${amountPrefix}${expense.amount.toFixed(2)} €
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
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-primary edit-expense-btn" 
                            data-expense-id="${expense.id}" 
                            title="Modifier cette dépense">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-info view-expense-btn" 
                            data-expense-id="${expense.id}" 
                            title="Voir les détails">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Réinitialiser les fonctionnalités des boutons et sélecteurs
        initStatusSwitches();
        initBulkSelection();
        initExpenseEdit();
        initExpenseView();
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
                <td colspan="8" class="text-center py-4">
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
                
                // Actualiser les statistiques
                fetchAndUpdateSummary();
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
        
        // Si aucun filtre actif, conserver toutes les lignes visibles
        if (statusFilters.length === 0) {
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
     * Cache une ligne avec une animation améliorée
     * @param {HTMLElement} row - La ligne à cacher
     */
    function hideRow(row) {
        // Stocker la hauteur initiale pour l'animation
        const initialHeight = row.offsetHeight;
        row.style.height = `${initialHeight}px`;
        
        // Forcer le repaint pour que l'animation fonctionne
        row.offsetHeight;
        
        // Appliquer l'animation de disparition
        row.style.transition = 'opacity 0.3s ease, height 0.5s ease, padding 0.5s ease';
        row.style.opacity = '0';
        row.style.padding = '0';
        row.style.height = '0';
        row.style.overflow = 'hidden';
        
        // Mettre à jour les statistiques - pas besoin d'attendre la fin de l'animation
        fetchAndUpdateSummary();
        
        // Une fois l'animation terminée, supprimer la ligne
        setTimeout(() => {
            // Supprimer la ligne du DOM
            if (row.parentNode) {
                row.parentNode.removeChild(row);
            }
            
            // Mettre à jour le compteur de résultats
            const totalRows = document.querySelectorAll('#expenses-table-body tr:not([style*="height: 0"])').length;
            document.getElementById('expenses-count').textContent = `${totalRows} dépenses`;
            
            // Afficher un message si plus aucune dépense
            if (totalRows === 0) {
                const tableBody = document.getElementById('expenses-table-body');
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-4">
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
        }, 500); // Durée de l'animation
    }
    
    /**
     * Récupère et met à jour les statistiques de résumé
     */
    function fetchAndUpdateSummary() {
        fetch('/tricount/reimbursements/summary', {
            method: 'POST',
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
                // Récupérer tous les filtres actuels
                const filterForm = document.getElementById('filter-form');
                const formData = new FormData(filterForm);
                
                // Créer une URL avec tous les paramètres
                const params = new URLSearchParams(formData);
                const exportUrl = `/tricount/reimbursements/export?${params.toString()}`;
                
                // Rediriger vers l'URL d'export
                window.location.href = exportUrl;
            });
        }
    }
    
    /**
     * Initialise les fonctionnalités d'édition de dépense
     */
    function initExpenseEdit() {
        const editButtons = document.querySelectorAll('.edit-expense-btn');
        const editModal = document.getElementById('editExpenseModal');
        const saveButton = document.getElementById('save-expense-btn');
        
        if (!editModal) return;
        
        const modal = new bootstrap.Modal(editModal);
        
        // Gérer les dépendances entre déclaré et remboursé
        const editDeclaredSwitch = document.getElementById('edit-declared');
        const editReimbursedSwitch = document.getElementById('edit-reimbursed');
        
        if (editDeclaredSwitch && editReimbursedSwitch) {
            editReimbursedSwitch.addEventListener('change', function() {
                if (this.checked && !editDeclaredSwitch.checked) {
                    editDeclaredSwitch.checked = true;
                }
            });
            
            editDeclaredSwitch.addEventListener('change', function() {
                if (!this.checked && editReimbursedSwitch.checked) {
                    editReimbursedSwitch.checked = false;
                }
            });
        }
        
        // Initialiser les boutons d'édition
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const expenseId = this.dataset.expenseId;
                
                // Charger les données de la dépense
                fetchExpenseData(expenseId, function(data) {
                    populateEditModal(data);
                    modal.show();
                });
            });
        });
        
        // Lien dans le modal de consultation pour passer en mode édition
        document.querySelector('.edit-from-view-btn')?.addEventListener('click', function() {
            // Fermer le modal de consultation
            bootstrap.Modal.getInstance(document.getElementById('viewExpenseModal')).hide();
            
            // Récupérer l'ID de la dépense depuis le formulaire d'édition
            const expenseId = document.getElementById('view-expense-id')?.value;
            if (expenseId) {
                // Charger les données et ouvrir le modal d'édition
                fetchExpenseData(expenseId, function(data) {
                    populateEditModal(data);
                    modal.show();
                });
            }
        });
        
        // Sauvegarde des modifications
        saveButton.addEventListener('click', function() {
            const form = document.getElementById('edit-expense-form');
            const formData = new FormData(form);
            
            // Ajouter les statuts
            formData.append('is_declared', document.getElementById('edit-declared').checked);
            formData.append('is_reimbursed', document.getElementById('edit-reimbursed').checked);
            
            // Désactiver le bouton pendant la sauvegarde
            saveButton.disabled = true;
            saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enregistrement...';
            
            // Envoyer les données
            fetch(form.action, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Fermer le modal
                    modal.hide();
                    
                    // Recharger les données
                    submitFiltersAjax();
                    
                    // Afficher un message de succès
                    alert('Modifications enregistrées avec succès.');
                } else {
                    alert('Erreur lors de l\'enregistrement: ' + (data.error || 'Erreur inconnue'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Erreur de communication avec le serveur.');
            })
            .finally(() => {
                // Réactiver le bouton
                saveButton.disabled = false;
                saveButton.innerHTML = 'Enregistrer';
            });
        });
    }
    
    /**
     * Récupère les données d'une dépense
     * @param {number} expenseId - ID de la dépense
     * @param {Function} callback - Fonction à appeler avec les données
     */
    function fetchExpenseData(expenseId, callback) {
        fetch(`/tricount/reimbursements/expense/${expenseId}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                callback(data.expense);
            } else {
                alert('Erreur lors du chargement des données: ' + (data.error || 'Erreur inconnue'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Erreur de communication avec le serveur.');
        });
    }
    
    /**
     * Remplit le modal d'édition avec les données de la dépense
     * @param {Object} expense - Données de la dépense
     */
    function populateEditModal(expense) {
        // Champs cachés
        document.getElementById('edit-expense-id').value = expense.id;
        
        // Champs en lecture seule
        document.getElementById('edit-date').value = expense.date;
        document.getElementById('edit-amount').value = `${parseFloat(expense.amount).toFixed(2)} €`;
        document.getElementById('edit-merchant').value = expense.display_name;
        document.getElementById('edit-description').value = expense.description;
        
        // Champs éditables
        if (document.getElementById('edit-category')) {
            document.getElementById('edit-category').value = expense.category_id || '';
        }
        
        if (document.getElementById('edit-flag')) {
            document.getElementById('edit-flag').value = expense.flag_id || '';
        }
        
        document.getElementById('edit-notes').value = expense.notes || '';
        document.getElementById('edit-declaration-ref').value = expense.declaration_reference || '';
        
        // Statuts
        document.getElementById('edit-declared').checked = expense.is_declared;
        document.getElementById('edit-reimbursed').checked = expense.is_reimbursed;
    }
    
    /**
     * Initialise l'affichage détaillé d'une dépense
     */
    function initExpenseView() {
        const viewButtons = document.querySelectorAll('.view-expense-btn');
        const viewModal = document.getElementById('viewExpenseModal');
        
        if (!viewModal) return;
        
        const modal = new bootstrap.Modal(viewModal);
        
        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const expenseId = this.dataset.expenseId;
                
                // Récupérer les données et afficher le modal
                fetchExpenseData(expenseId, function(expense) {
                    populateViewModal(expense);
                    modal.show();
                });
            });
        });
    }
    
    /**
     * Remplit le modal de consultation avec les données de la dépense
     * @param {Object} expense - Données de la dépense
     */
    function populateViewModal(expense) {
        // ID caché pour le passage en mode édition
        const idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.id = 'view-expense-id';
        idInput.value = expense.id;
        viewModal.appendChild(idInput);
        
        // Informations principales
        document.getElementById('view-merchant').textContent = expense.display_name;
        document.getElementById('view-description').textContent = expense.description || 'Aucune description';
        
        // Montant et date
        const amountElement = document.getElementById('view-amount');
        amountElement.textContent = `${parseFloat(expense.amount).toFixed(2)} €`;
        amountElement.className = expense.is_debit ? 'text-danger mb-0' : 'text-success mb-0';
        
        document.getElementById('view-date').textContent = expense.date;
        
        // Catégorie et flag
        if (expense.category) {
            document.getElementById('view-category').innerHTML = 
                `<span class="category-badge" style="border-color: ${expense.category.color}">
                     ${expense.category.name}
                 </span>`;
        } else {
            document.getElementById('view-category').innerHTML = '<span class="badge bg-secondary">Non catégorisé</span>';
        }
        
        if (expense.flag) {
            document.getElementById('view-flag').innerHTML = expense.flag_html;
        } else {
            document.getElementById('view-flag').innerHTML = '<span class="badge bg-secondary">Non défini</span>';
        }
        
        // Statut, références et dates
        let statusHtml = '';
        if (expense.is_reimbursed) {
            statusHtml = '<span class="badge bg-success">Remboursée</span>';
        } else if (expense.is_declared) {
            statusHtml = '<span class="badge bg-primary">Déclarée</span>';
        } else {
            statusHtml = '<span class="badge bg-secondary">Non déclarée</span>';
        }
        document.getElementById('view-status').innerHTML = statusHtml;
        
        document.getElementById('view-reference').textContent = expense.declaration_reference || 'Aucune référence';
        document.getElementById('view-notes').textContent = expense.notes || 'Aucune note';
        
        document.getElementById('view-declaration-date').textContent = 
            expense.declaration_date || 'Non déclarée';
        
        document.getElementById('view-reimbursement-date').textContent = 
            expense.reimbursement_date || 'Non remboursée';
        
        // Texte original
        const originalTextContainer = document.getElementById('original-text-container');
        const originalTextElement = document.getElementById('view-original-text');
        
        if (expense.original_text) {
            originalTextElement.textContent = expense.original_text;
            originalTextContainer.style.display = 'block';
        } else {
            originalTextContainer.style.display = 'none';
        }
    }
});

    
    /**
     * Initialise les filtres en mode AJAX
     */
    function initAjaxFilters() {
        const filterForm = document.getElementById('filter-form');
        if (!filterForm || !filterForm.dataset.ajaxFilter) return;
        
        // Récupérer tous les éléments de filtrage
        const filterInputs = document.querySelectorAll('#filter-form input, #filter-form select');
        const resetButton = document.getElementById('reset-filters-btn');
        const resetFilterLink = document.getElementById('reset-filters-link');
        let filterTimeout = null;
        
        // Ajouter des écouteurs à tous les éléments de filtrage
        filterInputs.forEach(input => {
            const eventType = input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input';
            
            input.addEventListener(eventType, function(e) {
                // Empêcher le comportement par défaut pour éviter un rechargement de page
                e.preventDefault();
                
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
                
                // Empêcher la propagation de l'événement
                return false;
            });
        });
        
        // Gérer le bouton de réinitialisation
        if (resetButton) {
            resetButton.addEventListener('click', function(e) {
                e.preventDefault();
                resetFilters();
                return false;
            });
        }
        
        if (resetFilterLink) {
            resetFilterLink.addEventListener('click', function(e) {
                e.preventDefault();
                resetFilters();
                return false;
            });
        }
        
        // Empêcher la soumission normale du formulaire
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitFiltersAjax();
            return false;
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
        
        // Enregistrer la position de défilement actuelle
        const scrollPosition = window.scrollY || window.pageYOffset;
        
        // Afficher l'indicateur de chargement
        if (loadingSpinner) {
            loadingSpinner.style.display = 'block';
        }
        
        // Créer directement un FormData pour capturer tous les champs
        const formData = new FormData(filterForm);
        formData.append('ajax', 'true');
        
        // Envoyer la requête AJAX avec POST au lieu de GET
        fetch(filterForm.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Mettre à jour le tableau avec les nouvelles données
                updateTableContent(data.expenses);
                
                // Mettre à jour les statistiques
                updateSummary(data.summary);
                
                // Mettre à jour la pagination
                if (data.pagination) {
                    updatePagination(data.pagination);
                }
                
                // Restaurer la position de défilement
                setTimeout(() => {
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'instant' // Utiliser 'auto' pour IE ou si 'instant' n'est pas supporté
                    });
                }, 10);
            } else {
                showErrorMessage(data.error || 'Une erreur est survenue lors du chargement des données.');
            }
        })
        .catch(error => {
            console.error('Erreur AJAX:', error);
            showErrorMessage('Erreur de communication avec le serveur.');
        })
        .finally(() => {
            // Cacher l'indicateur de chargement
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
            
            // Afficher le montant en rouge pour les dépenses (débit)
            const amountClass = expense.is_debit ? 'text-danger' : 'text-success';
            const amountPrefix = expense.is_debit ? '' : '+';
            
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
                <td class="${amountClass}">
                    ${amountPrefix}${expense.amount.toFixed(2)} €
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
                
                // Actualiser les statistiques
                fetchAndUpdateSummary();
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
        
        // Si aucun filtre actif, conserver toutes les lignes visibles
        if (statusFilters.length === 0) {
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
     * Cache une ligne avec une animation améliorée
     * @param {HTMLElement} row - La ligne à cacher
     */
    function hideRow(row) {
        // Stocker la hauteur initiale pour l'animation
        const initialHeight = row.offsetHeight;
        row.style.height = `${initialHeight}px`;
        
        // Forcer le repaint pour que l'animation fonctionne
        row.offsetHeight;
        
        // Appliquer l'animation de disparition
        row.style.transition = 'opacity 0.3s ease, height 0.5s ease, padding 0.5s ease';
        row.style.opacity = '0';
        row.style.padding = '0';
        row.style.height = '0';
        row.style.overflow = 'hidden';
        
        // Mettre à jour les statistiques - pas besoin d'attendre la fin de l'animation
        fetchAndUpdateSummary();
        
        // Une fois l'animation terminée, supprimer la ligne
        setTimeout(() => {
            // Supprimer la ligne du DOM
            if (row.parentNode) {
                row.parentNode.removeChild(row);
            }
            
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
        }, 500); // Durée de l'animation
    }
    
    /**
     * Récupère et met à jour les statistiques de résumé
     */
    function fetchAndUpdateSummary() {
        fetch('/tricount/reimbursements/summary', {
            method: 'POST',
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
                // Récupérer tous les filtres actuels
                const filterForm = document.getElementById('filter-form');
                const formData = new FormData(filterForm);
                
                // Créer une URL avec tous les paramètres
                const params = new URLSearchParams(formData);
                const exportUrl = `/tricount/reimbursements/export?${params.toString()}`;
                
                // Rediriger vers l'URL d'export
                window.location.href = exportUrl;
            });
        }
    }
});