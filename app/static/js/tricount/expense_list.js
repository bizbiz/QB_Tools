// app/static/js/tricount/expense_list.js

/**
 * Script pour gérer la page de liste des dépenses dans Tricount Helper
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les tooltips
    initTooltips();
    
    // Initialiser la modal d'édition
    initEditModal();
    
    /**
     * Initialise les tooltips Bootstrap
     */
    function initTooltips() {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    /**
     * Initialise la modal d'édition des dépenses
     */
    function initEditModal() {
        const editButtons = document.querySelectorAll('.edit-expense');
        const editModalElement = document.getElementById('editExpenseModal');
        
        // Vérifier que les éléments nécessaires existent
        if (!editModalElement) {
            console.error("Modal d'édition non trouvée dans le DOM");
            return;
        }
        
        const editModal = new bootstrap.Modal(editModalElement);
        const editForm = document.getElementById('edit-expense-form');
        const editExpenseId = document.getElementById('edit-expense-id');
        const editCategory = document.getElementById('edit-category');
        const editNotes = document.getElementById('edit-notes');
        const saveButton = document.getElementById('save-expense');
        
        // Ouvrir la modal d'édition quand on clique sur un bouton d'édition
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const row = this.closest('tr');
                const expenseId = row.dataset.expenseId;
                
                console.log("Ouverture de la modal pour l'ID de dépense:", expenseId);
                
                // Récupérer l'état actuel
                const categoryBadge = row.querySelector('td:nth-child(4) .badge, td:nth-child(4) .category-badge');
                const flagBadge = row.querySelector('td:nth-child(5) .badge, td:nth-child(5) .flag-badge');
                
                // Notes (à compléter si affiché dans le tableau)
                const notes = ""; // À récupérer si c'est affiché dans le tableau
                
                // Remplir le formulaire
                editExpenseId.value = expenseId;
                
                // Remplir la catégorie
                if (categoryBadge && !categoryBadge.classList.contains('bg-secondary')) {
                    // Chercher l'option correspondante par le nom de la catégorie
                    const categoryName = categoryBadge.textContent.trim();
                    const categoryOptions = Array.from(editCategory.options);
                    
                    console.log("Recherche de la catégorie:", categoryName);
                    
                    // Trouver l'option avec un texte qui contient le nom de la catégorie
                    const matchingOption = categoryOptions.find(option => {
                        return option.textContent.includes(categoryName);
                    });
                    
                    if (matchingOption) {
                        console.log("Catégorie trouvée:", matchingOption.value);
                        editCategory.value = matchingOption.value;
                    } else {
                        console.log("Catégorie non trouvée, utilisation par défaut");
                        editCategory.value = ''; // Non catégorisé par défaut
                    }
                } else {
                    console.log("Aucune catégorie trouvée, utilisation par défaut");
                    editCategory.value = '';
                }
                
                // Remplir les notes si disponibles
                if (editNotes) {
                    editNotes.value = notes;
                }
                
                // Gérer les flags (types de dépenses)
                const flagCheckboxes = document.querySelectorAll('#editExpenseModal input[type="checkbox"][id^="flag_"]');
                
                if (flagCheckboxes && flagCheckboxes.length) {
                    console.log("Flags trouvés dans la modal:", flagCheckboxes.length);
                    
                    // Récupérer le flag actuel dans la ligne
                    let flagName = "";
                    
                    if (flagBadge) {
                        flagName = flagBadge.textContent.trim();
                        console.log("Flag de la dépense:", flagName);
                    }
                    
                    // Décocher tous les flags d'abord
                    flagCheckboxes.forEach(checkbox => checkbox.checked = false);
                    
                    // Si un flag est présent, trouver et cocher le checkbox correspondant
                    if (flagName && flagName !== "Non défini") {
                        let flagFound = false;
                        
                        flagCheckboxes.forEach(checkbox => {
                            const label = document.querySelector(`label[for="${checkbox.id}"]`);
                            
                            if (label) {
                                // Le label contient un badge avec le nom du flag
                                const labelText = label.textContent.trim();
                                
                                // Vérifier si le nom du flag est dans le label
                                if (labelText.includes(flagName)) {
                                    console.log("Flag correspondant trouvé:", checkbox.id);
                                    checkbox.checked = true;
                                    flagFound = true;
                                }
                            }
                        });
                        
                        // Si aucun flag correspondant n'est trouvé, sélectionner le premier par défaut
                        if (!flagFound && flagCheckboxes.length > 0) {
                            console.log("Aucun flag correspondant trouvé, sélection du premier par défaut");
                            flagCheckboxes[0].checked = true;
                        }
                    } else {
                        // Si pas de flag, sélectionner le premier par défaut
                        if (flagCheckboxes.length > 0) {
                            console.log("Pas de flag trouvé, sélection du premier par défaut");
                            flagCheckboxes[0].checked = true;
                        }
                    }
                    
                    // Ajouter des écouteurs pour s'assurer qu'un seul flag est actif
                    flagCheckboxes.forEach(checkbox => {
                        // Supprimer les écouteurs précédents pour éviter les doublons
                        checkbox.removeEventListener('change', onFlagCheckboxChange);
                        checkbox.addEventListener('change', onFlagCheckboxChange);
                    });
                } else {
                    console.warn("Aucun checkbox de flag trouvé dans la modal");
                }
                
                // Ouvrir la modal
                editModal.show();
            });
        });
        
        // Enregistrer les modifications
        if (saveButton && editForm) {
            saveButton.addEventListener('click', function() {
                const formData = new FormData(editForm);
                const updateUrl = editForm.getAttribute('action') || '/tricount/expenses/update';
                
                // Trouver le flag sélectionné (un seul possible)
                const flagCheckboxes = document.querySelectorAll('#editExpenseModal input[type="checkbox"][id^="flag_"]:checked');
                let flagId = null;
                
                if (flagCheckboxes.length > 0) {
                    flagId = flagCheckboxes[0].value;
                    formData.set('flag_id', flagId);
                    console.log("Flag sélectionné pour la sauvegarde:", flagId);
                }
                
                console.log("Envoi des données au serveur:", updateUrl);
                
                fetch(updateUrl, {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log("Mise à jour réussie, rechargement de la page");
                        // Fermer la modal
                        editModal.hide();
                        
                        // Recharger la page pour voir les changements
                        window.location.reload();
                    } else {
                        console.error("Erreur lors de la mise à jour:", data.error);
                        alert('Erreur lors de la mise à jour: ' + (data.error || 'Erreur inconnue'));
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Erreur de connexion au serveur.');
                });
            });
        }
        
        /**
         * Gère le changement d'un checkbox de type de dépense
         * S'assure qu'un seul peut être actif à la fois
         */
        function onFlagCheckboxChange() {
            console.log("Changement de flag détecté:", this.id);
            
            const flagCheckboxes = document.querySelectorAll('#editExpenseModal input[type="checkbox"][id^="flag_"]');
            
            // Désactiver tous les autres checkboxes
            flagCheckboxes.forEach(cb => {
                if (cb !== this) {
                    cb.checked = false;
                }
            });
            
            // Si l'utilisateur essaie de décocher tous les checkboxes,
            // s'assurer qu'au moins un reste coché
            const hasChecked = Array.from(flagCheckboxes).some(cb => cb.checked);
            if (!hasChecked) {
                console.log("Tentative de décocher tous les flags, réactivation du flag courant");
                this.checked = true; // Réactiver le checkbox courant
            }
        }
    }
});