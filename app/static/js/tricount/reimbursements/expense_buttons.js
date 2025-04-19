// app/static/js/tricount/reimbursements/expense_buttons.js
/**
 * Module de gestion des boutons d'édition pour les remboursements
 */

import { fillExpenseForm } from '../../tricount/common/form_fields.js';

/**
 * Initialise les boutons d'édition dans le tableau de remboursements
 */
export function initExpenseButtons() {
    console.log("Initialisation des boutons d'édition de remboursements");
    
    // Récupérer les boutons d'édition
    const editButtons = document.querySelectorAll('.edit-expense-btn');
    
    // Réinitialiser les gestionnaires d'événements pour éviter les doublons
    editButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        
        // Ajouter le gestionnaire d'événement
        newButton.addEventListener('click', handleEditButtonClick);
        
        // Remplacer le bouton original
        if (button.parentNode) {
            button.parentNode.replaceChild(newButton, button);
        }
    });
}

export function reinitEditButtons() {
    // Appeler simplement initExpenseButtons pour réutiliser le code
    initExpenseButtons();
}

/**
 * Gère le clic sur un bouton d'édition
 * @param {Event} e - Événement de clic
 */
function handleEditButtonClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const expenseId = this.dataset.expenseId;
    if (!expenseId) {
        console.error("ID de dépense manquant sur le bouton d'édition");
        return false;
    }
    
    console.log(`Édition de la dépense ID: ${expenseId}`);
    
    // Utiliser l'éditeur global existant
    if (window.expenseEditor && typeof window.expenseEditor.loadExpense === 'function') {
        window.expenseEditor.loadExpense(expenseId);
    } else {
        console.error("Éditeur de dépenses non disponible");
    }
    
    return false;
}

/**
 * Charge les données d'une dépense et ouvre le modal
 * @param {string|number} expenseId - ID de la dépense à éditer
 */
function loadExpenseAndOpenModal(expenseId) {
    // Charger les données via AJAX
    fetch(`/tricount/reimbursements/expense/${expenseId}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            throw new Error(data.error || "Erreur lors du chargement des données");
        }
        
        // Ouvrir le modal et remplir avec les données
        const modalEl = document.getElementById('editExpenseModal');
        if (!modalEl) throw new Error("Modal non trouvé dans le DOM");
        
        // Mettre l'ID dans le formulaire
        const idField = document.getElementById('edit-expense-id');
        if (idField) idField.value = expenseId;
        
        // Remplir le formulaire avec la fonction appropriée
        fillExpenseForm(data.expense);
        
        // Ouvrir le modal
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    })
    .catch(error => {
        console.error("Erreur:", error);
        alert("Erreur lors du chargement des données: " + error.message);
    });
}

// Export par défaut pour une importation plus simple
export default { init: initExpenseButtons, reinit: reinitEditButtons };