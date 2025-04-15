// app/static/js/tricount/auto_categorize/conflicts.js

/**
 * Module de gestion des conflits entre règles d'auto-catégorisation
 * Vérifie si une règle en cours de création entrerait en conflit avec des règles existantes
 * et gère l'affichage des conflits au niveau des dépenses
 */

// Assurer que l'objet global existe
window.AutoCategorize = window.AutoCategorize || {};
window.AutoCategorize.Conflicts = {};

/**
 * Initialise la gestion des conflits
 */
AutoCategorize.initConflictDetection = function() {
    // Ajouter l'événement de vérification des conflits avant la soumission du formulaire
    const ruleForm = document.getElementById('rule-form');
    if (ruleForm) {
        ruleForm.addEventListener('submit', function(event) {
            // Empêcher la soumission immédiate du formulaire
            event.preventDefault();
            
            // Valider le formulaire avant de vérifier les conflits
            if (validateRuleForm()) {
                // Vérifier les conflits
                AutoCategorize.Conflicts.checkConflicts().then(hasConflicts => {
                    // Si pas de conflits ou l'utilisateur a confirmé, soumettre le formulaire
                    if (!hasConflicts) {
                        ruleForm.submit();
                    }
                });
            }
        });
    }
    
    // Initialiser les conflits au niveau des dépenses
    AutoCategorize.initConflicts();
};

/**
 * Initialise les badges de conflit sur les dépenses
 */
AutoCategorize.initConflicts = function() {
    // Initialiser les tooltips pour les badges de conflit
    const conflictBadges = document.querySelectorAll('.conflict-badge');
    conflictBadges.forEach(badge => {
        new bootstrap.Tooltip(badge);
        
        // Ajouter l'événement de clic pour afficher le détail du conflit
        badge.addEventListener('click', function(e) {
            e.preventDefault();
            const row = this.closest('tr');
            const expenseId = row.dataset.expenseId;
            
            AutoCategorize.showConflictDetails(expenseId);
        });
    });
    
    // Mettre à jour le compteur de conflits
    const conflictCount = document.getElementById('conflict-count');
    if (conflictCount && conflictBadges.length > 0) {
        conflictCount.textContent = conflictBadges.length;
        conflictCount.classList.remove('d-none');
    }
};

/**
 * Affiche les détails d'un conflit pour une dépense spécifique
 * @param {string} expenseId - ID de la dépense en conflit
 */
AutoCategorize.showConflictDetails = function(expenseId) {
    // Récupérer les informations sur le conflit via API
    fetch('/tricount/expense-rule-conflict/' + expenseId)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remplir les détails de la règle
                const ruleDetailsContainer = document.getElementById('conflict-rule-details');
                if (ruleDetailsContainer) {
                    let html = `
                        <div class="card-header">
                            <h5 class="card-title">${data.rule.name}</h5>
                        </div>
                        <div class="card-body">
                            <p><strong>Filtres:</strong></p>
                            <ul>
                    `;
                    
                    if (data.rule.merchant_contains) {
                        html += `<li>Marchand contient: ${data.rule.merchant_contains}</li>`;
                    }
                    
                    if (data.rule.description_contains) {
                        html += `<li>Description contient: ${data.rule.description_contains}</li>`;
                    }
                    
                    html += `
                            </ul>
                            <p><strong>Actions:</strong></p>
                            <ul>
                    `;
                    
                    if (data.rule.apply_category) {
                        html += `<li>Catégoriser en "${data.rule.category_name}"</li>`;
                    }
                    
                    if (data.rule.apply_flag) {
                        html += `<li>Appliquer le type "${data.rule.flag_name}"</li>`;
                    }
                    
                    if (data.rule.apply_rename) {
                        html += `<li>Renommer selon le motif "${data.rule.rename_pattern}"</li>`;
                    }
                    
                    html += `
                            </ul>
                        </div>
                    `;
                    
                    ruleDetailsContainer.innerHTML = html;
                }
                
                // Configurer le bouton d'édition
                const editButton = document.getElementById('edit-conflict-rule-btn');
                if (editButton) {
                    editButton.href = '/tricount/auto-rules/edit/' + data.rule.id;
                }
                
                // Afficher la modal
                const modal = new bootstrap.Modal(document.getElementById('conflict-detail-modal'));
                modal.show();
            } else {
                alert('Erreur lors de la récupération des détails du conflit.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Erreur de communication avec le serveur.');
        });
};

/**
 * Vérifie si la règle en cours de création entrerait en conflit avec des règles existantes
 * @return {Promise<boolean>} Promise résolvant à true si des conflits ont été trouvés
 */
AutoCategorize.Conflicts.checkConflicts = function() {
    return new Promise((resolve) => {
        // Récupérer les données du formulaire
        const ruleData = AutoCategorize.getRuleData();
        
        // Afficher un indicateur de chargement
        const submitButton = document.querySelector('#rule-form button[type="submit"]');
        if (submitButton) {
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Vérification des conflits...';
            submitButton.disabled = true;
        }
        
        // Appeler l'API pour vérifier les conflits
        fetch('/tricount/check-rule-conflicts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ruleData)
        })
        .then(response => response.json())
        .then(data => {
            // Restaurer le bouton
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-save me-2"></i>Créer la règle';
                submitButton.disabled = false;
            }
            
            if (data.success && data.has_conflicts) {
                // Afficher la modal de conflit avec les détails
                AutoCategorize.Conflicts.showConflictModal(data.conflicts, ruleData, () => {
                    // Callback quand l'utilisateur choisit de continuer malgré les conflits
                    resolve(false);
                });
                resolve(true);
            } else {
                // Pas de conflits, continuer
                resolve(false);
            }
        })
        .catch(error => {
            console.error('Error checking conflicts:', error);
            
            // Restaurer le bouton
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-save me-2"></i>Créer la règle';
                submitButton.disabled = false;
            }
            
            // En cas d'erreur, permettre la soumission pour ne pas bloquer l'utilisateur
            resolve(false);
        });
    });
};

/**
 * Récupère toutes les données du formulaire de règle
 * @return {Object} Données de la règle formatées pour l'API
 */
AutoCategorize.getRuleData = function() {
    const form = document.getElementById('rule-form');
    
    // Récupérer toutes les valeurs du formulaire
    const formData = new FormData(form);
    const ruleData = {};
    
    // Convertir FormData en objet simple
    for (const [key, value] of formData.entries()) {
        if (key === 'min_amount' || key === 'max_amount') {
            // Convertir les montants en nombres si présents
            ruleData[key] = value ? parseFloat(value) : null;
        } else if (key === 'requires_confirmation' || key === 'apply_now' || 
                   key === 'apply_category' || key === 'apply_flag' || 
                   key === 'apply_rename_merchant' || key === 'apply_rename_description') {
            // Convertir les cases à cocher en booléens
            ruleData[key] = (value === 'true');
        } else {
            ruleData[key] = value;
        }
    }
    
    // Définir les sources de modification
    if (ruleData.apply_category) {
        ruleData.category_modified_by = window.modificationSources.AUTO_RULE;
    }
    
    if (ruleData.apply_flag) {
        ruleData.flag_modified_by = window.modificationSources.AUTO_RULE;
    }
    
    if (ruleData.apply_rename_merchant) {
        ruleData.merchant_modified_by = window.modificationSources.AUTO_RULE;
    }
    
    if (ruleData.apply_rename_description) {
        ruleData.notes_modified_by = window.modificationSources.AUTO_RULE;
    }
    
    return ruleData;
};

/**
 * Affiche la modal de conflit avec les détails des règles en conflit
 * @param {Array} conflicts - Liste des conflits détectés
 * @param {Object} newRuleData - Données de la nouvelle règle
 * @param {Function} continueCallback - Fonction à appeler si l'utilisateur choisit de continuer
 */
AutoCategorize.Conflicts.showConflictModal = function(conflicts, newRuleData, continueCallback) {
    // Vérifier si la modal existe déjà, sinon la créer
    let conflictModal = document.getElementById('rule-conflict-modal');
    
    if (!conflictModal) {
        // Créer la modal
        conflictModal = document.createElement('div');
        conflictModal.id = 'rule-conflict-modal';
        conflictModal.className = 'modal fade';
        conflictModal.tabIndex = '-1';
        conflictModal.setAttribute('aria-labelledby', 'rule-conflict-modal-label');
        conflictModal.setAttribute('aria-hidden', 'true');
        
        // Structure de la modal
        conflictModal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title" id="rule-conflict-modal-label">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Conflit entre règles d'auto-catégorisation
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>
                            <strong>La règle que vous êtes en train de créer entrerait en conflit avec des règles existantes.</strong>
                            Deux règles d'auto-catégorisation ne peuvent pas s'appliquer à la même dépense pour éviter des comportements incohérents.
                        </p>
                        
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Pourquoi est-ce un problème?</strong>
                            <ul class="mb-0 mt-2">
                                <li>Les dépenses ne peuvent avoir qu'une seule catégorie et un seul type</li>
                                <li>Des règles contradictoires pourraient causer des changements imprévisibles</li>
                                <li>La règle la plus récente remplacerait les catégorisations précédentes</li>
                            </ul>
                        </div>
                        
                        <h5 class="mt-4">Règles en conflit :</h5>
                        <div id="conflict-rules-container" class="mb-3"></div>
                        
                        <div class="alert alert-secondary">
                            <i class="fas fa-lightbulb me-2"></i>
                            <strong>Solutions:</strong>
                            <ul class="mb-0 mt-2">
                                <li>Modifier les règles existantes pour limiter leur portée</li>
                                <li>Ajuster votre nouvelle règle pour cibler d'autres dépenses</li>
                                <li>Continuer malgré le conflit (seule la règle la plus récente s'appliquera)</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                        <button type="button" class="btn btn-primary" id="continue-despite-conflicts">
                            Continuer malgré les conflits
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Ajouter la modal au body
        document.body.appendChild(conflictModal);
    }
    
    // Initialiser la modal Bootstrap
    const modalInstance = new bootstrap.Modal(conflictModal);
    
    // Remplir le conteneur des règles en conflit
    const rulesContainer = document.getElementById('conflict-rules-container');
    rulesContainer.innerHTML = '';
    
    conflicts.forEach((conflict, index) => {
        const ruleInfo = conflict.rule;
        const card = document.createElement('div');
        card.className = 'card mb-3';
        
        // Créer le contenu de la carte
        let cardContent = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">${ruleInfo.name}</h6>
                <div>
                    <a href="/tricount/auto-rules/edit/${ruleInfo.id}" class="btn btn-sm btn-outline-primary" target="_blank">
                        <i class="fas fa-edit"></i> Modifier
                    </a>
                </div>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Filtres :</strong></p>
                        <ul>
        `;
        
        if (ruleInfo.merchant_contains) {
            cardContent += `<li>Marchand contient : ${ruleInfo.merchant_contains}</li>`;
        }
        
        if (ruleInfo.description_contains) {
            cardContent += `<li>Description contient : ${ruleInfo.description_contains}</li>`;
        }
        
        if (ruleInfo.min_amount || ruleInfo.max_amount) {
            cardContent += `<li>Montant : `;
            if (ruleInfo.min_amount) cardContent += `min. ${ruleInfo.min_amount.toFixed(2)}€ `;
            if (ruleInfo.min_amount && ruleInfo.max_amount) cardContent += `- `;
            if (ruleInfo.max_amount) cardContent += `max. ${ruleInfo.max_amount.toFixed(2)}€`;
            cardContent += `</li>`;
        }
        
        cardContent += `
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Actions appliquées :</strong></p>
                        <ul>
        `;
        
        if (ruleInfo.apply_category) {
            cardContent += `<li>Catégoriser en "${ruleInfo.category_name || 'Non définie'}"</li>`;
        }
        
        if (ruleInfo.apply_flag) {
            cardContent += `<li>Appliquer le type "${ruleInfo.flag_name || 'Non défini'}"</li>`;
        }
        
        if (ruleInfo.apply_rename) {
            cardContent += `<li>Renommer selon le motif "${ruleInfo.rename_pattern || ''}"</li>`;
        }
        
        cardContent += `
                        </ul>
                    </div>
                </div>
                
                <p><strong>Dépenses affectées par ce conflit :</strong></p>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Marchand</th>
                                <th>Montant</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        conflict.expenses.forEach(expense => {
            cardContent += `
                <tr>
                    <td>${expense.date}</td>
                    <td>${expense.merchant}</td>
                    <td class="${expense.is_debit ? 'text-danger' : 'text-success'}">
                        ${expense.is_debit ? '-' : ''}${expense.amount.toFixed(2)} €
                    </td>
                </tr>
            `;
        });
        
        cardContent += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        card.innerHTML = cardContent;
        rulesContainer.appendChild(card);
    });
    
    // Gérer le bouton de continuation malgré les conflits
    const continueButton = document.getElementById('continue-despite-conflicts');
    continueButton.onclick = function() {
        modalInstance.hide();
        if (typeof continueCallback === 'function') {
            continueCallback();
        }
    };
    
    // Afficher la modal
    modalInstance.show();
};