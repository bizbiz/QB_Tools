// app/static/js/tricount/reimbursements/filters.js

import { showErrorMessage } from './core.js';
import { updateTableContent, updateSummary, updatePagination } from './ui.js';

// Variable pour stocker le délai de filtrage
let filterTimeout = null;
// Variable pour éviter les requêtes simultanées
let isRequestPending = false;

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
        
        // Supprimer les anciens écouteurs pour éviter les duplications
        input.removeEventListener(eventType, handleFilterChange);
        
        // Ajouter le nouvel écouteur
        input.addEventListener(eventType, handleFilterChange);
    });
    
    // Gérer le bouton de réinitialisation
    if (resetButton) {
        resetButton.removeEventListener('click', handleResetClick);
        resetButton.addEventListener('click', handleResetClick);
    }
    
    if (resetFilterLink) {
        resetFilterLink.removeEventListener('click', handleResetClick);
        resetFilterLink.addEventListener('click', handleResetClick);
    }
    
    // Empêcher la soumission normale du formulaire
    filterForm.removeEventListener('submit', handleFormSubmit);
    filterForm.addEventListener('submit', handleFormSubmit);
    
    // Initialiser la pagination AJAX
    initAjaxPagination();
    
    // Exposer la fonction triggerFilter globalement pour Select2
    window.triggerFilter = triggerFilter;
    
    // Exposer la fonction resetFilters globalement pour pouvoir l'appeler depuis ailleurs
    window.resetFilters = resetFilters;
    
    // Exposer la fonction submitFiltersAjax pour le tri AJAX
    window.submitFiltersAjax = submitFiltersAjax;
    
    console.log('Filters initialized');
}

/**
 * Gestionnaire pour le changement d'un filtre
 * @param {Event} e - Événement
 */
function handleFilterChange(e) {
    // Empêcher le comportement par défaut pour éviter un rechargement de page
    e.preventDefault();
    
    // Déclencher le filtrage avec délai
    triggerFilter();
    
    // Empêcher la propagation de l'événement
    return false;
}

/**
 * Gestionnaire pour le clic sur le bouton de réinitialisation
 * @param {Event} e - Événement
 */
function handleResetClick(e) {
    e.preventDefault();
    resetFilters();
    return false;
}

/**
 * Gestionnaire pour la soumission du formulaire
 * @param {Event} e - Événement
 */
function handleFormSubmit(e) {
    e.preventDefault();
    submitFiltersAjax();
    return false;
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
    if (!filterForm) return;
    
    try {
        // Réinitialiser tous les champs à leurs valeurs par défaut
        filterForm.reset();
        
        // Conserver les paramètres de tri actuels
        const sortInput = filterForm.querySelector('input[name="sort"]');
        const orderInput = filterForm.querySelector('input[name="order"]');
        const currentSort = sortInput && sortInput.value ? sortInput.value : 'date';
        const currentOrder = orderInput && orderInput.value ? orderInput.value : 'desc';
        
        // Sélecteur de type d'affichage - définissons explicitement sa valeur
        // Pour "Remboursables uniquement" par défaut:
        const showAllSelect = document.getElementById('show_all');
        if (showAllSelect) {
            showAllSelect.value = '0';
        }
        
        // Cocher tous les statuts par défaut
        const notDeclaredCheck = document.getElementById('status-not-declared');
        const declaredCheck = document.getElementById('status-declared');
        const reimbursedCheck = document.getElementById('status-reimbursed');
        
        if (notDeclaredCheck) notDeclaredCheck.checked = true;
        if (declaredCheck) declaredCheck.checked = true;
        if (reimbursedCheck) reimbursedCheck.checked = true;
        
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
    } catch (error) {
        console.error('Error in resetFilters:', error);
        // Essayer une approche plus simple en cas d'erreur - recharger la page
        window.location.reload();
    }
}

/**
 * Soumet le formulaire de filtrage via AJAX
 */
export function submitFiltersAjax() {
    // Empêcher les requêtes simultanées
    if (isRequestPending) {
        console.log('Request already pending, ignoring');
        return;
    }
    
    isRequestPending = true;
    
    const filterForm = document.getElementById('filter-form');
    const loadingSpinner = document.getElementById('table-loading-spinner');
    
    if (!filterForm) {
        isRequestPending = false;
        return;
    }
    
    // Enregistrer la position de défilement actuelle
    const scrollPosition = window.scrollY || window.pageYOffset;
    
    // Afficher l'indicateur de chargement
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
    }
    
    // Créer directement un FormData pour capturer tous les champs
    let formData;
    try {
        formData = new FormData(filterForm);
        formData.append('ajax', 'true');
    } catch (error) {
        console.error('Error creating FormData:', error);
        isRequestPending = false;
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        return;
    }
    
    console.log('Submitting AJAX request...');
    
    // Envoyer la requête AJAX avec POST au lieu de GET
    fetch(filterForm.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        try {
            if (data && data.success) {
                // Vérifier et préparer les données pour éviter les erreurs
                if (Array.isArray(data.expenses)) {
                    // Mettre à jour le tableau avec les nouvelles données
                    updateTableContent(data.expenses);
                } else {
                    showErrorMessage('Format de données invalide reçu du serveur.');
                }
                
                // Mettre à jour les statistiques
                if (data.summary) {
                    updateSummary(data.summary);
                }
                
                // Mettre à jour la pagination
                if (data.pagination) {
                    updatePagination(data.pagination);
                }
                
                // Restaurer la position de défilement
                setTimeout(() => {
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'auto'
                    });
                }, 10);
            } else {
                showErrorMessage(data.error || 'Une erreur est survenue lors du chargement des données.');
            }
        } catch (error) {
            console.error('Error processing response data:', error);
            showErrorMessage('Erreur lors du traitement des données.');
        }
    })
    .catch(error => {
        console.error('Erreur AJAX:', error);
        showErrorMessage('Erreur de communication avec le serveur: ' + error.message);
    })
    .finally(() => {
        // Cacher l'indicateur de chargement
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        // Réinitialiser le drapeau
        isRequestPending = false;
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
    if (!filterForm) return false;
    
    // Supprimer l'ancien input de page s'il existe
    const oldPageInput = filterForm.querySelector('input[name="page"]');
    if (oldPageInput) {
        filterForm.removeChild(oldPageInput);
    }
    
    try {
        // Ajouter le nouvel input
        filterForm.appendChild(pageInput);
        
        // Déclencher une soumission AJAX
        submitFiltersAjax();
    } catch (error) {
        console.error('Error in pagination handler:', error);
    }
    
    return false;
}