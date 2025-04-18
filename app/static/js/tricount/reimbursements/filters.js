// app/static/js/tricount/reimbursements/filters.js

import { showErrorMessage } from './core.js';
import { updateTableContent, updateSummary, updatePagination } from './ui.js';

// Variable pour stocker le délai de filtrage
let filterTimeout = null;

/**
 * Initialise les filtres en mode AJAX
 */
export function initFilters() {
    const filterForm = document.getElementById('filter-form');
    if (!filterForm || !filterForm.dataset.ajaxFilter) return;
    
    // Récupérer tous les éléments de filtrage
    const filterInputs = document.querySelectorAll('#filter-form input, #filter-form select');
    const resetButton = document.getElementById('reset-filters-btn');
    const resetFilterLink = document.getElementById('reset-filters-link');
    
    // Ajouter des écouteurs à tous les éléments de filtrage
    filterInputs.forEach(input => {
        const eventType = input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input';
        
        input.addEventListener(eventType, function(e) {
            // Empêcher le comportement par défaut pour éviter un rechargement de page
            e.preventDefault();
            
            // Déclencher le filtrage avec délai
            triggerFilter();
            
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
    
    // Initialiser la pagination AJAX
    initAjaxPagination();
    
    // Initialiser le tri AJAX si la table a l'attribut approprié
    initAjaxSorting();
    
    // Exposer la fonction triggerFilter globalement pour Select2
    window.triggerFilter = triggerFilter;
    
    // Exposer la fonction resetFilters globalement pour pouvoir l'appeler depuis ailleurs
    window.resetFilters = resetFilters;
    
    // Exposer la fonction submitFiltersAjax pour le tri AJAX
    window.submitFiltersAjax = submitFiltersAjax;
}

/**
 * Initialise le tri AJAX pour le tableau de dépenses
 */
function initAjaxSorting() {
    const expensesTable = document.getElementById('expenses-table');
    if (!expensesTable) return;
    
    // Vérifier si le tableau est déjà initialisé avec AjaxTableManager
    if (expensesTable.dataset.ajaxSortable === 'true') return;
    
    // Vérifier si AjaxTableManager est disponible
    if (typeof window.AjaxTableManager !== 'undefined' && typeof window.AjaxTableManager.init === 'function') {
        // Initialiser avec des options spécifiques pour ce tableau
        window.AjaxTableManager.init(expensesTable, {
            formSelector: '#filter-form',
            submitFunction: submitFiltersAjax,
            defaultSort: 'date',
            defaultOrder: 'desc',
            onBeforeSort: function(table, column, order) {
                // Montrer l'indicateur de chargement
                const loadingSpinner = document.getElementById('table-loading-spinner');
                if (loadingSpinner) {
                    loadingSpinner.style.display = 'block';
                }
            }
        });
        
        console.log('AJAX sorting initialized for expenses table');
    } else {
        console.warn('AjaxTableManager not available, AJAX sorting disabled');
    }
}

/**
 * Déclenche le filtrage avec un délai pour éviter trop de requêtes
 */
export function triggerFilter() {
    // Annuler le timeout précédent
    if (filterTimeout) {
        clearTimeout(filterTimeout);
    }
    
    // Montrer l'indicateur de chargement
    const loadingSpinner = document.getElementById('table-loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
    }
    
    // Définir un nouveau timeout pour éviter trop de requêtes
    filterTimeout = setTimeout(() => {
        submitFiltersAjax();
    }, 500);
}

/**
 * Réinitialise tous les filtres et soumet le formulaire
 */
export function resetFilters() {
    console.log("Réinitialisation des filtres");
    const filterForm = document.getElementById('filter-form');
    
    // Réinitialiser tous les champs à leurs valeurs par défaut
    filterForm.reset();
    
    // Conserver les paramètres de tri actuels
    const sortInput = filterForm.querySelector('input[name="sort"]');
    const orderInput = filterForm.querySelector('input[name="order"]');
    const currentSort = sortInput ? sortInput.value : 'date';
    const currentOrder = orderInput ? orderInput.value : 'desc';
    
    // Sélecteur de type d'affichage - définissons explicitement sa valeur
    // Pour "Remboursables uniquement" par défaut:
    document.getElementById('show_all').value = '0';
    
    // Cocher tous les statuts par défaut
    document.getElementById('status-not-declared').checked = true;
    document.getElementById('status-declared').checked = true;
    document.getElementById('status-reimbursed').checked = true;
    
    // Pour les sélecteurs améliorés avec Select2, il faut aussi déclencher leur événement change
    if (typeof $ !== 'undefined' && $.fn.select2) {
        $('#show_all').trigger('change');
        $('#flag_id').trigger('change');
    }
    
    // Restaurer les paramètres de tri
    if (sortInput) sortInput.value = currentSort;
    if (orderInput) orderInput.value = currentOrder;
    
    // Soumettre le formulaire avec AJAX
    submitFiltersAjax();
}

/**
 * Soumet le formulaire de filtrage via AJAX
 */
export function submitFiltersAjax() {
    const filterForm = document.getElementById('filter-form');
    const tableBody = document.getElementById('expenses-table-body');
    const loadingSpinner = document.getElementById('table-loading-spinner');
    
    if (!filterForm) return;
    
    // Enregistrer la position de défilement actuelle
    const scrollPosition = window.scrollY || window.pageYOffset;
    
    // Afficher l'indicateur de chargement
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
    }
    
    // Mettre à jour l'UI de tri si AjaxTableManager est disponible
    const sortInput = filterForm.querySelector('input[name="sort"]');
    const orderInput = filterForm.querySelector('input[name="order"]');
    const expensesTable = document.getElementById('expenses-table');
    
    if (expensesTable && sortInput && orderInput && window.AjaxTableManager) {
        window.AjaxTableManager.updateSortUI(expensesTable, sortInput.value, orderInput.value);
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
 * Initialise la pagination AJAX
 */
export function initAjaxPagination() {
    const paginationLinks = document.querySelectorAll('#pagination .page-link:not(.disabled)');
    
    paginationLinks.forEach(link => {
        // Supprimer les anciens écouteurs pour éviter les duplications
        link.removeEventListener('click', handlePaginationClick);
        
        // Ajouter le nouvel écouteur d'événement
        link.addEventListener('click', handlePaginationClick);
    });
}

/**
 * Gère le clic sur un lien de pagination
 * @param {Event} e - Événement de clic
 */
function handlePaginationClick(e) {
    e.preventDefault();
    
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
}