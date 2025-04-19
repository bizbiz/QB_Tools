// app/static/js/tricount/modals/index.js
/**
 * Point d'entrée pour les modals de dépenses
 * Importe et initialise toutes les fonctionnalités des modals
 */

import ExpenseEditor from './expense_editor.js';
import ExpenseViewer from './expense_viewer.js';

/**
 * Initialise tous les modals de dépenses
 * @param {Object} options - Options de configuration
 */
function initExpenseModals(options = {}) {
    // Fusionner les options par défaut
    const defaultOptions = {
        editorModalId: 'editExpenseModal',
        viewerModalId: 'viewExpenseModal',
        editorEndpoint: '/tricount/reimbursements/expense',
        viewerEndpoint: '/tricount/reimbursements/expense',
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Créer les instances des modals si les éléments existent
    if (document.getElementById(config.editorModalId)) {
        window.expenseEditor = new ExpenseEditor({
            modalId: config.editorModalId,
            expenseEndpointUrl: config.editorEndpoint,
            afterSaveCallback: config.afterSaveCallback
        });
    }
    
    if (document.getElementById(config.viewerModalId)) {
        window.expenseViewer = new ExpenseViewer(
            config.viewerModalId,
            config.viewerEndpoint
        );
    }
    
    // Initialiser les boutons de visualisation et d'édition
    initModalButtons();
    
    return {
        editor: window.expenseEditor,
        viewer: window.expenseViewer
    };
}

/**
 * Initialise les boutons pour les modals (visualiser et éditer)
 */
function initModalButtons() {
    // Initialiser les boutons d'édition
    const editButtons = document.querySelectorAll('.edit-expense-btn');
    editButtons.forEach(button => {
        // Supprimer les anciens écouteurs pour éviter les duplications
        const newButton = button.cloneNode(true);
        
        // Ajouter le nouvel écouteur
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            const expenseId = this.dataset.expenseId;
            
            if (window.expenseEditor && expenseId) {
                window.expenseEditor.loadExpense(expenseId);
            }
        });
        
        // Remplacer le bouton original
        if (button.parentNode) {
            button.parentNode.replaceChild(newButton, button);
        }
    });
    
    // Initialiser les boutons de visualisation
    const viewButtons = document.querySelectorAll('.view-expense-btn');
    viewButtons.forEach(button => {
        // Supprimer les anciens écouteurs pour éviter les duplications
        const newButton = button.cloneNode(true);
        
        // Ajouter le nouvel écouteur
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            const expenseId = this.dataset.expenseId;
            
            if (window.expenseViewer && expenseId) {
                window.expenseViewer.showExpense(expenseId);
            }
        });
        
        // Remplacer le bouton original
        if (button.parentNode) {
            button.parentNode.replaceChild(newButton, button);
        }
    });
}

// Initialiser les modals au chargement du document
document.addEventListener('DOMContentLoaded', function() {
    initExpenseModals();
});

// Exposer l'API pour une utilisation externe
export default {
    init: initExpenseModals,
    ExpenseEditor,
    ExpenseViewer
};

// Exposer pour une utilisation traditionnelle (sans import)
window.ExpenseModals = {
    init: initExpenseModals,
    // Utilitaires pour faciliter l'accès par les scripts traditionnels
    showExpense: function(expenseId) {
        if (window.expenseViewer) {
            window.expenseViewer.showExpense(expenseId);
        }
    },
    editExpense: function(expenseId) {
        if (window.expenseEditor) {
            window.expenseEditor.loadExpense(expenseId);
        }
    }
};