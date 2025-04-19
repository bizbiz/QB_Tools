// app/static/js/tricount/reimbursements/edit_buttons.js
/**
 * Module minimal pour réinitialiser les boutons d'édition après AJAX
 * Compatible avec l'implémentation ExpenseEditor existante
 */

/**
 * Réinitialise les gestionnaires d'événements sur les boutons d'édition
 */
export function reinitEditButtons() {
    console.log("Reconnexion des boutons d'édition à l'éditeur existant...");
    
    // Récupérer tous les boutons d'édition
    const editButtons = document.querySelectorAll('.edit-expense-btn');
    
    // Créer des copies pour s'assurer qu'il n'y a pas de gestionnaires existants
    editButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        
        // Attacher un gestionnaire simple qui utilise l'éditeur global
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            const expenseId = this.dataset.expenseId;
            if (!expenseId) return;
            
            // Utiliser l'éditeur existant via l'API globale
            if (window.expenseEditor && typeof window.expenseEditor.loadExpense === 'function') {
                window.expenseEditor.loadExpense(expenseId);
            }
        });
        
        // Remplacer l'original par la copie
        if (button.parentNode) {
            button.parentNode.replaceChild(newButton, button);
        }
    });
}

// Export pour l'utilisation modulaire
export default { reinit: reinitEditButtons };