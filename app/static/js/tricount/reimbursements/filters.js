// app/static/js/tricount/reimbursements/filters.js
/**
 * Gestion des filtres pour le module de remboursements
 */

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
    
    // Exposer la fonction resetFilters globalement pour pouvoir l'appeler depuis ailleurs
    window.resetFilters = resetFilters;
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