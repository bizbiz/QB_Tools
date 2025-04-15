// À ajouter/remplacer dans app/static/js/tricount/auto_categorize/rename.js

/**
 * Met à jour la simulation de renommage sur les dépenses similaires
 */
function updateRenamingSimulation() {
    // Récupérer les valeurs actuelles
    const merchantPattern = document.getElementById('rename-merchant-pattern');
    const merchantReplacement = document.getElementById('rename-merchant-replacement');
    const descriptionPattern = document.getElementById('rename-description-pattern');
    const descriptionReplacement = document.getElementById('rename-description-replacement');
    const applyMerchantRename = document.getElementById('apply-rename-merchant');
    const applyDescriptionRename = document.getElementById('apply-rename-description');
    
    // Vérifier si les éléments existent
    if (!merchantPattern || !merchantReplacement || !descriptionPattern || 
        !descriptionReplacement || !applyMerchantRename || !applyDescriptionRename) {
        console.warn("Éléments de formulaire manquants pour la simulation");
        return;
    }
    
    // Vérifier si les conditions sont remplies pour la simulation
    const simulateMerchant = applyMerchantRename.checked && 
                           merchantPattern.value.trim() !== '';
    
    const simulateDescription = applyDescriptionRename.checked && 
                             descriptionPattern.value.trim() !== '';
    
    // Stocker les données de simulation pour l'affichage
    window.AutoCategorize.simulationData = {
        merchant: simulateMerchant ? {
            pattern: merchantPattern.value,
            replacement: merchantReplacement.value || ''
        } : null,
        description: simulateDescription ? {
            pattern: descriptionPattern.value,
            replacement: descriptionReplacement.value || ''
        } : null
    };
    
    console.log("Données de simulation mises à jour:", window.AutoCategorize.simulationData);
    
    // Appliquer la simulation aux dépenses actuellement affichées
    applySimulationToExpenses();
}

/**
 * Applique la simulation aux dépenses actuellement affichées
 */
function applySimulationToExpenses() {
    // Récupérer les données de simulation
    const simulationData = window.AutoCategorize.simulationData;
    if (!simulationData) {
        console.warn("Aucune donnée de simulation disponible");
        return;
    }
    
    console.log("Application des simulations:", simulationData);
    
    // Récupérer toutes les lignes de dépenses
    const expenseRows = document.querySelectorAll('tr.apply-expense-row');
    
    if (expenseRows.length === 0) {
        console.warn("Aucune ligne de dépense trouvée pour appliquer la simulation");
        return;
    }
    
    expenseRows.forEach(row => {
        const expenseId = row.dataset.expenseId;
        
        // Chercher les éléments de marchand et description
        const merchantElement = row.querySelector('.original-merchant');
        const simulatedMerchantElement = row.querySelector('.simulated-merchant');
        const detailsContainer = row.querySelector('.details-container');
        const descContainer = row.querySelector('.description-info');
        
        // Simuler le renommage du marchand
        if (simulationData.merchant && merchantElement) {
            const originalMerchant = merchantElement.textContent.trim().replace(/Original$/, '').trim();
            
            try {
                // Créer une expression régulière à partir du pattern
                const merchantRegex = new RegExp(simulationData.merchant.pattern, 'g');
                
                // Appliquer le remplacement
                const simulatedMerchant = originalMerchant.replace(merchantRegex, simulationData.merchant.replacement);
                
                // Vérifier si cela a changé quelque chose
                if (simulatedMerchant !== originalMerchant) {
                    // Créer ou mettre à jour l'élément simulé
                    if (!simulatedMerchantElement) {
                        // Créer un nouvel élément
                        const simulatedElement = document.createElement('div');
                        simulatedElement.className = 'simulated-merchant small text-warning';
                        simulatedElement.innerHTML = `
                            <i class="fas fa-magic me-1"></i>Sera renommé en: <strong>${simulatedMerchant}</strong>
                        `;
                        
                        // Insérer après le marchand original
                        if (merchantElement.nextSibling) {
                            merchantElement.parentNode.insertBefore(simulatedElement, merchantElement.nextSibling);
                        } else {
                            merchantElement.parentNode.appendChild(simulatedElement);
                        }
                    } else {
                        // Mettre à jour l'élément existant
                        simulatedMerchantElement.innerHTML = `
                            <i class="fas fa-magic me-1"></i>Sera renommé en: <strong>${simulatedMerchant}</strong>
                        `;
                    }
                } else if (simulatedMerchantElement) {
                    // Supprimer l'élément simulé s'il n'y a plus de changement
                    simulatedMerchantElement.remove();
                }
            } catch (e) {
                console.error("Erreur lors de la simulation de renommage:", e);
            }
        } else if (simulatedMerchantElement) {
            // Supprimer l'élément simulé si la simulation est désactivée
            simulatedMerchantElement.remove();
        }
        
        // Gérer la simulation de description
        if (simulationData.description) {
            // On doit attendre que les détails soient affichés pour simuler la description
            // Donc on va ajouter un gestionnaire spécial pour les boutons de détails
            const toggleButton = row.querySelector('.btn-toggle-details');
            if (toggleButton) {
                // Stocker les données de simulation dans l'élément lui-même pour y accéder plus tard
                toggleButton.dataset.simulateDescription = 'true';
                
                // On remplace l'écouteur d'événement standard par notre version améliorée
                toggleButton.removeEventListener('click', onToggleDetails);
                toggleButton.addEventListener('click', onToggleDetailsWithSimulation);
            }
            
            // Si la section de description est déjà visible, appliquer directement la simulation
            if (descContainer) {
                applyDescriptionSimulation(expenseId, descContainer, simulationData.description);
            }
        } else {
            // Supprimer la simulation existante si présente
            const simDescriptionElements = row.querySelectorAll('.simulated-description');
            simDescriptionElements.forEach(el => el.remove());
            
            // Réinitialiser le bouton de détails
            const toggleButton = row.querySelector('.btn-toggle-details');
            if (toggleButton) {
                toggleButton.dataset.simulateDescription = 'false';
            }
        }
    });
}

/**
 * Applique la simulation de description à un conteneur spécifique
 */
function applyDescriptionSimulation(expenseId, descContainer, descSimData) {
    // Trouver l'élément de description originale
    const descElement = descContainer.querySelector('.original-description');
    if (!descElement) return;
    
    // Trouver l'élément simulé existant ou en créer un nouveau
    let simulatedDescElement = descContainer.querySelector('.simulated-description');
    
    // Extraire la description originale du texte complet
    const textContent = descElement.textContent || '';
    const originalDesc = textContent.replace('Description originale:', '').trim();
    
    if (!originalDesc) return;
    
    try {
        // Créer une expression régulière à partir du pattern
        const descRegex = new RegExp(descSimData.pattern, 'g');
        
        // Appliquer le remplacement
        const simulatedDesc = originalDesc.replace(descRegex, descSimData.replacement);
        
        // Vérifier si cela a changé quelque chose
        if (simulatedDesc !== originalDesc) {
            if (!simulatedDescElement) {
                // Créer un nouvel élément
                simulatedDescElement = document.createElement('div');
                simulatedDescElement.className = 'simulated-description mt-2 small text-warning';
                descContainer.appendChild(simulatedDescElement);
            }
            
            simulatedDescElement.innerHTML = `
                <i class="fas fa-magic me-1"></i>Sera modifié en: <strong>${simulatedDesc}</strong>
            `;
        } else if (simulatedDescElement) {
            // Supprimer l'élément simulé s'il n'y a plus de changement
            simulatedDescElement.remove();
        }
    } catch (e) {
        console.error("Erreur lors de la simulation de modification de description:", e);
    }
}

/**
 * Gestionnaire d'événement pour les boutons de détails avec simulation
 */
function onToggleDetailsWithSimulation() {
    // Comportement standard
    const targetId = this.getAttribute('data-bs-target');
    const isExpanded = this.getAttribute('aria-expanded') === 'true';
    
    // Mise à jour dynamique du texte et de l'icône
    if (isExpanded) {
        this.innerHTML = '<i class="fas fa-ellipsis-h"></i> Voir détails';
    } else {
        this.innerHTML = '<i class="fas fa-chevron-up"></i> Masquer détails';
        
        // Si la simulation est activée pour ce bouton et qu'on l'ouvre
        if (this.dataset.simulateDescription === 'true') {
            // Attendre que les détails soient affichés
            setTimeout(() => {
                // Récupérer les données de simulation
                const simulationData = window.AutoCategorize.simulationData;
                if (!simulationData || !simulationData.description) return;
                
                // Trouver le container de détails
                const expenseId = this.closest('tr').dataset.expenseId;
                const targetElement = document.querySelector(targetId);
                if (!targetElement) return;
                
                const descContainer = targetElement.querySelector('.description-info');
                if (descContainer) {
                    applyDescriptionSimulation(expenseId, descContainer, simulationData.description);
                }
            }, 100);
        }
    }
}

/**
 * Gestionnaire d'événement standard pour les boutons de détails
 */
function onToggleDetails() {
    const targetId = this.getAttribute('data-bs-target');
    const isExpanded = this.getAttribute('aria-expanded') === 'true';
    
    // Mise à jour dynamique du texte et de l'icône
    if (isExpanded) {
        this.innerHTML = '<i class="fas fa-ellipsis-h"></i> Voir détails';
    } else {
        this.innerHTML = '<i class="fas fa-chevron-up"></i> Masquer détails';
    }
}

// Exposer les fonctions pour être appelées de l'extérieur
window.AutoCategorize.applySimulation = function() {
    // Reconstruire les données de simulation à chaque appel
    updateRenamingSimulation();
};