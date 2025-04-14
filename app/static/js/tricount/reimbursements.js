// app/static/js/tricount/reimbursements.js

/**
 * Script pour gérer la page de suivi des remboursements dans Tricount Helper
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les tooltips
    initTooltips();
    
    // Initialiser la modal d'édition du statut
    initEditStatusModal();
    
    // Initialiser les fonctionnalités de sélection en masse
    initBulkSelection();
    
    // Initialiser les couleurs de ligne selon les statuts
    initStatusColors();
    
    // Initialiser le bouton d'export
    initExportButton();
    
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
     * Initialise les couleurs de ligne selon le statut de déclaration
     */
    function initStatusColors() {
        const rows = document.querySelectorAll('tr[data-expense-id]');
        rows.forEach(row => {
            const statusBadge = row.querySelector('.declaration-status-badge');
            if (statusBadge) {
                if (statusBadge.textContent.trim() === 'Déclarée') {
                    row.classList.add('expense-declared');
                } else if (statusBadge.textContent.trim() === 'Remboursée') {
                    row.classList.add('expense-reimbursed');
                }
            }
        });
    }
    
    /**
     * Initialise les fonctionnalités de sélection en masse
     */
    function initBulkSelection() {
        const selectAllCheckbox = document.getElementById('select-all-expenses');
        const expenseCheckboxes = document.querySelectorAll('.expense-checkbox');
        const bulkDeclareBtn = document.getElementById('bulk-declare-btn');
        const bulkDeclareModal = new bootstrap.Modal(document.getElementById('bulkDeclareModal'));
        const selectedCountSpan = document.getElementById('selected-count');
        const confirmBulkBtn = document.getElementById('confirm-bulk-declare');
        
        // Vérifier que les éléments existent
        if (!selectAllCheckbox || !bulkDeclareBtn) return;
        
        // Sélectionner/désélectionner toutes les dépenses
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            
            expenseCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
                const row = checkbox.closest('tr');
                if (row) {
                    if (isChecked) {
                        row.classList.add('selected');
                    } else {
                        row.classList.remove('selected');
                    }
                }
            });
            
            updateSelectedCount();
        });
        
        // Mettre à jour l'apparence des lignes quand une case est cochée
        expenseCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const row = this.closest('tr');
                if (row) {
                    if (this.checked) {
                        row.classList.add('selected');
                    } else {
                        row.classList.remove('selected');
                    }
                }
                
                updateSelectedCount();
                updateSelectAllState();
            });
        });
        
        // Ouvrir la modal de déclaration en masse
        bulkDeclareBtn.addEventListener('click', function() {
            const selectedCount = getSelectedCount();
            
            if (selectedCount === 0) {
                alert('Veuillez sélectionner au moins une dépense.');
                return;
            }
            
            if (selectedCountSpan) {
                selectedCountSpan.textContent = selectedCount;
            }
            
            bulkDeclareModal.show();
        });
        
        // Confirmer la déclaration en masse
        if (confirmBulkBtn) {
            confirmBulkBtn.addEventListener('click', function() {
                bulkUpdateStatus();
            });
        }
        
        /**
         * Met à jour l'état du bouton "Tout sélectionner"
         */
        function updateSelectAllState() {
            const totalCheckboxes = expenseCheckboxes.length;
            const checkedCount = getSelectedCount();
            
            if (checkedCount === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (checkedCount === totalCheckboxes) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.indeterminate = true;
            }
        }
        
        /**
         * Met à jour le compteur de dépenses sélectionnées
         */
        function updateSelectedCount() {
            const count = getSelectedCount();
            
            // Mettre à jour l'état du bouton de déclaration en masse
            if (bulkDeclareBtn) {
                if (count > 0) {
                    bulkDeclareBtn.textContent = `Déclarer la sélection (${count})`;
                    bulkDeclareBtn.disabled = false;
                } else {
                    bulkDeclareBtn.textContent = 'Déclarer la sélection';
                    bulkDeclareBtn.disabled = true;
                }
            }
        }
        
        /**
         * Récupère le nombre de dépenses sélectionnées
         * @return {number} Nombre de dépenses sélectionnées
         */
        function getSelectedCount() {
            return document.querySelectorAll('.expense-checkbox:checked').length;
        }
        
        /**
         * Récupère les IDs des dépenses sélectionnées
         * @return {Array} Liste des IDs des dépenses sélectionnées
         */
        function getSelectedExpenseIds() {
            const selectedCheckboxes = document.querySelectorAll('.expense-checkbox:checked');
            return Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
        }
        
        /**
         * Met à jour le statut de plusieurs dépenses en une seule fois
         */
        function bulkUpdateStatus() {
            const expenseIds = getSelectedExpenseIds();
            const status = document.getElementById('bulk-status').value;
            const reference = document.getElementById('bulk-reference').value;
            
            if (expenseIds.length === 0) {
                alert('Veuillez sélectionner au moins une dépense.');
                return;
            }
            
            // Afficher un indicateur de chargement
            confirmBulkBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Traitement...';
            confirmBulkBtn.disabled = true;
            
            // Appeler l'API pour mettre à jour les statuts
            fetch('/tricount/reimbursements/bulk-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    expense_ids: expenseIds,
                    status: status,
                    reference: reference
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    bulkDeclareModal.hide();
                    
                    // Afficher un message de succès
                    alert(`${data.updated} dépenses mises à jour avec succès. ${data.skipped} dépenses ignorées.`);
                    
                    // Recharger la page pour voir les changements
                    window.location.reload();
                } else {
                    alert('Erreur lors de la mise à jour: ' + (data.error || 'Erreur inconnue'));
                    confirmBulkBtn.innerHTML = 'Confirmer';
                    confirmBulkBtn.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Erreur de communication avec le serveur.');
                confirmBulkBtn.innerHTML = 'Confirmer';
                confirmBulkBtn.disabled = false;
            });
        }
    }
    
    /**
     * Initialise la modal d'édition du statut de remboursement
     */
    function initEditStatusModal() {
        const editButtons = document.querySelectorAll('.edit-status-btn');
        const editModalElement = document.getElementById('editStatusModal');
        
        // Vérifier que les éléments nécessaires existent
        if (!editModalElement) {
            console.error("Modal d'édition non trouvée dans le DOM");
            return;
        }
        
        const editModal = new bootstrap.Modal(editModalElement);
        const editForm = document.getElementById('edit-status-form');
        const editExpenseId = document.getElementById('edit-expense-id');
        const editStatus = document.getElementById('edit-status');
        const editReference = document.getElementById('edit-reference');
        const editNotes = document.getElementById('edit-notes');
        const saveButton = document.getElementById('save-status-btn');
        
        // Ouvrir la modal d'édition quand on clique sur un bouton d'édition
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const row = this.closest('tr');
                const expenseId = row.dataset.expenseId;
                
                console.log("Ouverture de la modal pour l'ID de dépense:", expenseId);
                
                // Récupérer l'état actuel
                const statusBadge = row.querySelector('.declaration-status-badge');
                const referenceElement = row.querySelector('.reference-number');
                
                // Déterminer le statut actuel
                let currentStatus = 'not_declared';
                if (statusBadge) {
                    if (statusBadge.textContent.trim() === 'Déclarée') {
                        currentStatus = 'declared';
                    } else if (statusBadge.textContent.trim() === 'Remboursée') {
                        currentStatus = 'reimbursed';
                    }
                }
                
                // Déterminer la référence actuelle
                let currentReference = '';
                if (referenceElement) {
                    currentReference = referenceElement.textContent.trim();
                }
                
                // Remplir le formulaire
                editExpenseId.value = expenseId;
                editStatus.value = currentStatus;
                editReference.value = currentReference;
                
                // Les notes ne sont pas visibles dans le tableau, il faudrait les récupérer via AJAX
                // Pour cet exemple, on les laisse vides
                editNotes.value = '';
                
                // Ouvrir la modal
                editModal.show();
            });
        });
        
        // Enregistrer les modifications
        if (saveButton && editForm) {
            saveButton.addEventListener('click', function() {
                const formData = new FormData(editForm);
                const expenseId = formData.get('expense_id');
                const updateUrl = `/tricount/reimbursements/update/${expenseId}`;
                
                // Afficher un indicateur de chargement
                saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enregistrement...';
                saveButton.disabled = true;
                
                fetch(updateUrl, {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log("Mise à jour réussie:", data);
                        
                        // Fermer la modal
                        editModal.hide();
                        
                        // Mettre à jour l'affichage sans recharger la page
                        updateRowStatus(expenseId, data.expense.status, formData.get('reference'));
                        
                        // Réinitialiser le bouton
                        saveButton.innerHTML = 'Enregistrer';
                        saveButton.disabled = false;
                    } else {
                        console.error("Erreur lors de la mise à jour:", data.error);
                        alert('Erreur lors de la mise à jour: ' + (data.error || 'Erreur inconnue'));
                        
                        // Réinitialiser le bouton
                        saveButton.innerHTML = 'Enregistrer';
                        saveButton.disabled = false;
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Erreur de communication avec le serveur.');
                    
                    // Réinitialiser le bouton
                    saveButton.innerHTML = 'Enregistrer';
                    saveButton.disabled = false;
                });
            });
        }
        
        /**
         * Met à jour l'affichage d'une ligne sans recharger la page
         * @param {string} expenseId - ID de la dépense
         * @param {string} status - Nouveau statut
         * @param {string} reference - Nouvelle référence
         */
        function updateRowStatus(expenseId, status, reference) {
            const row = document.querySelector(`tr[data-expense-id="${expenseId}"]`);
            if (!row) return;
            
            const statusCell = row.querySelector('td:nth-child(6)');
            const referenceCell = row.querySelector('td:nth-child(7)');
            
            if (statusCell) {
                // Mettre à jour le badge de statut
                let badgeClass = 'bg-secondary';
                let statusText = 'Non déclarée';
                
                if (status === 'declared') {
                    badgeClass = 'bg-primary';
                    statusText = 'Déclarée';
                    row.classList.add('expense-declared');
                    row.classList.remove('expense-reimbursed');
                } else if (status === 'reimbursed') {
                    badgeClass = 'bg-success';
                    statusText = 'Remboursée';
                    row.classList.add('expense-reimbursed');
                    row.classList.remove('expense-declared');
                } else {
                    row.classList.remove('expense-declared', 'expense-reimbursed');
                }
                
                statusCell.innerHTML = `<span class="badge ${badgeClass} declaration-status-badge">${statusText}</span>`;
            }
            
            if (referenceCell) {
                // Mettre à jour la référence
                if (reference) {
                    referenceCell.innerHTML = `<span class="reference-number">${reference}</span>`;
                } else {
                    referenceCell.innerHTML = '<span class="text-muted">-</span>';
                }
            }
            
            // Ajouter une animation pour montrer que la ligne a été mise à jour
            row.classList.add('status-updated');
            setTimeout(() => {
                row.classList.remove('status-updated');
            }, 2000);
        }
    }
    
    /**
     * Initialise le bouton d'export
     */
    function initExportButton() {
        const exportBtn = document.getElementById('export-btn');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                // Cette partie sera implémentée dans une version future
                alert('La fonctionnalité d\'export sera disponible prochainement.');
            });
        }
    }
});