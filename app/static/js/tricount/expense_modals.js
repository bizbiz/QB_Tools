// app/static/js/tricount/expense_modals.js
/**
 * Point d'entrée simplifié pour les modals de dépenses
 * 
 * Ce fichier est destiné à être chargé directement via une balise script
 * dans des pages qui n'utilisent pas les modules ES6. Il facilite l'accès
 * aux fonctionnalités des modals sans nécessiter d'import.
 */

// Charger la version module avec le bon chemin
document.addEventListener('DOMContentLoaded', function() {
    // Créer l'élément script pour charger le module index.js
    const script = document.createElement('script');
    script.type = 'module';
    
    // Utiliser une fonction auto-exécutée pour obtenir le chemin de base
    script.textContent = `
        import ExpenseModals from './modals/index.js';
        
        // Rendre ExpenseModals accessible globalement
        window.ExpenseModals = ExpenseModals;
        
        // Initialiser les modals avec les options par défaut
        ExpenseModals.init({
            afterSaveCallback: function() {
                // Chercher une fonction de rafraîchissement dans la page
                if (typeof window.refreshExpenses === 'function') {
                    window.refreshExpenses();
                } else if (typeof window.submitFiltersAjax === 'function') {
                    window.submitFiltersAjax();
                }
            }
        });
        
        // Définir les fonctions d'aide globales
        window.showExpenseDetails = function(expenseId) {
            if (window.expenseViewer) {
                window.expenseViewer.showExpense(expenseId);
            }
        };
        
        window.editExpense = function(expenseId) {
            if (window.expenseEditor) {
                window.expenseEditor.loadExpense(expenseId);
            }
        };
        
        // Signal pour indiquer que les modals sont prêts
        document.dispatchEvent(new CustomEvent('expense-modals-ready'));
    `;
    
    // Ajouter le script au document
    document.head.appendChild(script);
    
    console.log('Chargeur de modals de dépenses initialisé');
});

// Exposer une fonction de vérification de disponibilité
window.checkExpenseModalsReady = function(callback) {
    if (window.ExpenseModals) {
        callback();
    } else {
        document.addEventListener('expense-modals-ready', callback);
    }
};