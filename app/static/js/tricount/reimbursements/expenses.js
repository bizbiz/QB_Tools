// app/static/js/tricount/reimbursements/expenses.js
/**
 * Gestion des dépenses (édition, visualisation, export)
 */

import { submitFiltersAjax } from './filters.js';
import { fetchAndUpdateSummary } from './ui.js';

function reinitializeEditButtons() {
    console.log("Réinitialisation des boutons d'édition...");
    // Utiliser la fonction d'initialisation des boutons d'édition si disponible
    if (typeof window.initEditButtons === 'function') {
        window.initEditButtons();
    }
}

/**
 * Initialise les fonctionnalités de gestion des dépenses
 */
export function initExpenseManagement() {
    // Nous utilisons maintenant ExpenseEditor pour l'édition
    // mais gardons les fonctionnalités de visualisation et d'export
    initExpenseView();
    initExportButton();
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
        // Supprimer les gestionnaires d'événements existants pour éviter les doublons
        button.removeEventListener('click', handleViewButtonClick);
        // Ajouter le nouveau gestionnaire
        button.addEventListener('click', handleViewButtonClick);
    });
    
    function handleViewButtonClick() {
        const expenseId = this.dataset.expenseId;
        console.log("Affichage dépense ID:", expenseId);
        
        // Récupérer les données et afficher le modal
        fetchExpenseData(expenseId, function(expense) {
            populateViewModal(expense);
            modal.show();
        });
    }
}

/**
 * Récupère les données d'une dépense
 * @param {number} expenseId - ID de la dépense
 * @param {Function} callback - Fonction à appeler avec les données
 */
function fetchExpenseData(expenseId, callback) {
    console.log("Fetching expense data for ID:", expenseId);
    
    fetch(`/tricount/reimbursements/expense/${expenseId}`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("Données reçues:", data.expense);
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
 * Remplit le modal de consultation avec les données de la dépense
 * @param {Object} expense - Données de la dépense
 */
function populateViewModal(expense) {
    // ID caché pour le passage en mode édition
    const viewModal = document.getElementById('viewExpenseModal');
    if (!viewModal) return;
    
    // Supprimer l'ancien ID s'il existe
    const oldIdInput = document.getElementById('view-expense-id');
    if (oldIdInput) oldIdInput.remove();
    
    // Créer un nouvel input pour l'ID
    const idInput = document.createElement('input');
    idInput.type = 'hidden';
    idInput.id = 'view-expense-id';
    idInput.value = expense.id;
    viewModal.appendChild(idInput);
    
    // Informations principales
    const merchantElement = document.getElementById('view-merchant');
    if (merchantElement) {
        // Afficher le marchand renommé s'il existe, sinon le marchand original
        merchantElement.textContent = expense.renamed_merchant || expense.merchant;
        
        // Si le marchand a été renommé, ajouter une indication
        if (expense.renamed_merchant) {
            const originalInfo = document.createElement('small');
            originalInfo.className = 'text-muted d-block';
            originalInfo.innerHTML = `<i class="fas fa-tag me-1"></i>Nom original: ${expense.merchant}`;
            merchantElement.appendChild(originalInfo);
        }
    }
    
    const descriptionElement = document.getElementById('view-description');
    if (descriptionElement) {
        // Afficher les notes si elles existent, sinon la description originale
        descriptionElement.textContent = expense.notes || expense.description || 'Aucune description';
        
        // Si des notes ont été ajoutées, ajouter une indication
        if (expense.notes && expense.description) {
            const originalInfo = document.createElement('small');
            originalInfo.className = 'text-muted d-block mt-2';
            originalInfo.innerHTML = `<i class="fas fa-align-left me-1"></i>Description originale: ${expense.description}`;
            descriptionElement.appendChild(originalInfo);
        }
    }
    
    // Montant et date
    const amountElement = document.getElementById('view-amount');
    if (amountElement) {
        amountElement.textContent = `${parseFloat(expense.amount).toFixed(2)} €`;
        amountElement.className = expense.is_debit ? 'text-danger mb-0' : 'text-success mb-0';
    }
    
    const dateElement = document.getElementById('view-date');
    if (dateElement) dateElement.textContent = expense.date;
    
    // Catégorie et flag
    const categoryElement = document.getElementById('view-category');
    if (categoryElement) {
        if (expense.category) {
            categoryElement.innerHTML = 
                `<span class="category-badge" style="border-color: ${expense.category.color}">
                     ${expense.category.name}
                 </span>`;
        } else {
            categoryElement.innerHTML = '<span class="badge bg-secondary">Non catégorisé</span>';
        }
    }
    
    const flagElement = document.getElementById('view-flag');
    if (flagElement) {
        if (expense.flag) {
            flagElement.innerHTML = expense.flag_html || 
                `<span class="badge" style="background-color: ${expense.flag.color}">${expense.flag.name}</span>`;
        } else {
            flagElement.innerHTML = '<span class="badge bg-secondary">Non défini</span>';
        }
    }
    
    // Afficher le statut de remboursement
    const reimbursableElement = document.getElementById('view-reimbursable-status');
    if (reimbursableElement && expense.flag) {
        if (expense.flag.reimbursement_type === 'not_reimbursable') {
            reimbursableElement.innerHTML = '<span class="badge bg-secondary"><i class="fas fa-ban me-1"></i>Non remboursable</span>';
        } else if (expense.flag.reimbursement_type === 'partially_reimbursable') {
            reimbursableElement.innerHTML = '<span class="badge bg-info"><i class="fas fa-percent me-1"></i>Partiellement remboursable</span>';
        } else if (expense.flag.reimbursement_type === 'fully_reimbursable') {
            reimbursableElement.innerHTML = '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Entièrement remboursable</span>';
        }
    }
    
    // Statut, références et dates
    const statusElement = document.getElementById('view-status');
    if (statusElement) {
        let statusHtml = '';
        if (expense.is_reimbursed) {
            statusHtml = '<span class="badge bg-success">Remboursée</span>';
        } else if (expense.is_declared) {
            statusHtml = '<span class="badge bg-primary">Déclarée</span>';
        } else {
            statusHtml = '<span class="badge bg-secondary">Non déclarée</span>';
        }
        statusElement.innerHTML = statusHtml;
    }
    
    const referenceElement = document.getElementById('view-reference');
    if (referenceElement) referenceElement.textContent = expense.declaration_reference || 'Aucune référence';
    
    const notesElement = document.getElementById('view-notes');
    if (notesElement) notesElement.textContent = expense.notes || 'Aucune note';
    
    const declDateElement = document.getElementById('view-declaration-date');
    if (declDateElement) declDateElement.textContent = expense.declaration_date || 'Non déclarée';
    
    const reimbDateElement = document.getElementById('view-reimbursement-date');
    if (reimbDateElement) reimbDateElement.textContent = expense.reimbursement_date || 'Non remboursée';
    
    // Texte original
    const originalTextContainer = document.getElementById('original-text-container');
    const originalTextElement = document.getElementById('view-original-text');
    
    if (originalTextContainer && originalTextElement) {
        if (expense.original_text) {
            originalTextElement.textContent = expense.original_text;
            originalTextContainer.style.display = 'block';
        } else {
            originalTextContainer.style.display = 'none';
        }
    }
    
    // Configurer le bouton d'édition dans la vue détaillée
    setupEditFromViewButton(expense.id);
}

/**
 * Configure le bouton pour passer du mode visualisation au mode édition
 * @param {number} expenseId - ID de la dépense
 */
function setupEditFromViewButton(expenseId) {
    const editFromViewBtn = document.querySelector('.edit-from-view-btn');
    if (editFromViewBtn) {
        // Supprimer les anciens listeners
        const newBtn = editFromViewBtn.cloneNode(true);
        editFromViewBtn.parentNode.replaceChild(newBtn, editFromViewBtn);
        
        // Ajouter le nouveau listener
        newBtn.addEventListener('click', function() {
            // Fermer le modal de consultation
            const viewModal = document.getElementById('viewExpenseModal');
            if (viewModal) {
                bootstrap.Modal.getInstance(viewModal).hide();
            }
            
            // Utiliser l'éditeur de dépense pour ouvrir le modal d'édition
            if (window.expenseEditor) {
                window.expenseEditor.loadExpense(expenseId);
            }
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
            if (!filterForm) return;
            
            const formData = new FormData(filterForm);
            
            // Créer une URL avec tous les paramètres
            const params = new URLSearchParams(formData);
            const exportUrl = `/tricount/reimbursements/export?${params.toString()}`;
            
            // Rediriger vers l'URL d'export
            window.location.href = exportUrl;
        });
    }
}