// app/static/js/tricount/categorize.js
// Mettre à jour la partie de la fonction qui gère l'envoi du formulaire

saveButtons.forEach(button => {
    button.addEventListener('click', function() {
        const expenseId = this.dataset.expenseId;
        const form = document.getElementById(`categorize-form-${expenseId}`);
        const formData = new FormData(form);
        
        // Vérifier si une catégorie a été sélectionnée
        const categoryId = formData.get('category_id');
        if (!categoryId) {
            alert('Veuillez sélectionner une catégorie avant d\'enregistrer.');
            return;
        }
        
        // URL pour l'API mise à jour
        const updateUrl = '/tricount/expenses/update';
        
        // Envoyer les données au serveur
        fetch(updateUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Masquer la carte de la dépense avec une animation
                const container = document.getElementById(`expense-container-${expenseId}`);
                container.style.transition = 'opacity 0.5s ease';
                container.style.opacity = '0';
                
                setTimeout(() => {
                    container.style.display = 'none';
                    
                    // Mettre à jour le compteur
                    const currentCount = parseInt(expensesCount.textContent);
                    expensesCount.textContent = currentCount - 1;
                    
                    // Si toutes les dépenses sont catégorisées, afficher un message
                    if (currentCount - 1 <= 0) {
                        document.getElementById('expenses-container').innerHTML = `
                            <div class="col-12">
                                <div class="alert alert-success">
                                    <i class="fas fa-check-circle me-2"></i>
                                    Toutes les dépenses ont été catégorisées. Vous pouvez 
                                    <a href="/tricount/import">importer de nouvelles dépenses</a> 
                                    ou consulter la <a href="/tricount/expenses">liste complète des dépenses</a>.
                                </div>
                            </div>
                        `;
                    }
                }, 500);
            } else {
                alert('Erreur lors de la mise à jour: ' + (data.error || 'Erreur inconnue'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Erreur de connexion au serveur.');
        });
    });
});