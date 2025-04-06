// app/static/js/tricount/auto_categorize/validation.js

// Étendre les fonctionnalités du sous-module Validation
(function() {
    const Validation = window.AutoCategorize.Validation;

    /**
     * Initialise la validation du formulaire
     */
    Validation.init = function() {
        // Ajouter la validation au formulaire
        const ruleForm = document.getElementById('rule-form');
        
        if (ruleForm) {
            ruleForm.addEventListener('submit', Validation.onFormSubmit);
        }
        
        // Ajouter des écouteurs aux cases à cocher pour mettre à jour l'état de validation en temps réel
        const checkboxes = document.querySelectorAll('.section-toggle');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                // Réinitialiser la validation pour cette section
                const sectionId = this.id.replace('apply-', '');
                const section = document.getElementById(`${sectionId}-section`);
                
                if (section) {
                    Validation.validateSection(section, this.checked);
                }
            });
        });
        
        // Ajouter des écouteurs aux champs requis pour validation en temps réel
        const requiredFields = document.querySelectorAll('[data-required="true"]');
        requiredFields.forEach(field => {
            field.addEventListener('input', function() {
                Validation.validateField(this);
            });
            
            field.addEventListener('change', function() {
                Validation.validateField(this);
            });
        });
        
        // Initialiser la vérification des conflits
        Validation.initConflictCheck();
    };

    /**
     * Initialise la vérification des conflits
     */
    Validation.initConflictCheck = function() {
        const ruleForm = document.getElementById('rule-form');
        if (ruleForm) {
            // S'assurer qu'on ne duplique pas les écouteurs d'événement
            ruleForm.removeEventListener('submit', Validation.onFormSubmit);
            ruleForm.addEventListener('submit', Validation.onFormSubmit);
        }
    };

    /**
     * Gère la soumission du formulaire
     * @param {Event} event - L'événement de soumission
     */
    Validation.onFormSubmit = async function(event) {
        // Empêcher la soumission par défaut
        event.preventDefault();
        
        // Supprimer les alertes de conflit précédentes
        const existingAlert = document.getElementById('conflict-alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Valider le formulaire
        if (Validation.validateForm()) {
            // Vérifier les conflits si la fonction existe
            if (typeof Validation.checkRuleConflicts === 'function') {
                const hasConflicts = await Validation.checkRuleConflicts();
                
                // Si pas de conflits, soumettre le formulaire
                if (!hasConflicts) {
                    event.target.submit();
                }
            } else {
                // Si la fonction de vérification n'existe pas, soumettre directement
                event.target.submit();
            }
        } else {
            // Scroll vers la première erreur
            const firstError = document.querySelector('.validation-error.visible');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    /**
     * Vérifie les conflits avec d'autres règles existantes
     * @returns {Promise<boolean>} true si des conflits existent, false sinon
     */
    Validation.checkRuleConflicts = async function() {
        // Récupérer les données du formulaire
        const formData = window.AutoCategorize.getFilters ? window.AutoCategorize.getFilters() : {};
        
        try {
            // Appeler l'API pour vérifier les conflits
            const response = await fetch('/tricount/check-rule-conflicts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success && data.has_conflicts && data.conflicts && data.conflicts.length > 0) {
                // Afficher l'alerte de conflit
                Validation.showConflictAlert(data.conflicts);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error checking for conflicts:', error);
            return false; // En cas d'erreur, ne pas bloquer la soumission
        }
    };

    /**
     * Affiche une alerte de conflit avec des options pour résoudre
     * @param {Array} conflicts - Liste des règles en conflit
     */
    Validation.showConflictAlert = function(conflicts) {
        const alertContainer = document.createElement('div');
        alertContainer.className = 'alert alert-danger mt-3';
        alertContainer.id = 'conflict-alert';
        
        let alertContent = `
            <h5><i class="fas fa-exclamation-triangle me-2"></i>Conflit avec des règles existantes</h5>
            <p>Cette règle entrerait en conflit avec ${conflicts.length} règle(s) existante(s) qui affecte(nt) déjà certaines dépenses:</p>
            <ul>
        `;
        
        conflicts.forEach(conflict => {
            const rule = conflict.rule;
            alertContent += `
                <li>
                    <strong>${rule.name}</strong> 
                    (affecte ${conflict.expenses.length} dépense(s)) 
                    <a href="/tricount/auto-rules/edit/${rule.id}" class="btn btn-sm btn-outline-primary ms-2">
                        <i class="fas fa-edit me-1"></i>Modifier cette règle
                    </a>
                </li>
            `;
        });
        
        alertContent += `
            </ul>
            <p>Options pour résoudre ce conflit:</p>
            <ol>
                <li>Modifier vos filtres actuels pour éviter le chevauchement</li>
                <li>Modifier la ou les règles existantes pour limiter leur portée</li>
                <li>Continuer malgré tout (les nouvelles valeurs remplaceront les anciennes pour les dépenses en conflit)</li>
            </ol>
            <div class="d-flex justify-content-end mt-3">
                <button type="button" id="resolve-conflict-btn" class="btn btn-primary me-2">
                    <i class="fas fa-wrench me-1"></i>Modifier mes filtres
                </button>
                <button type="button" id="ignore-conflict-btn" class="btn btn-warning">
                    <i class="fas fa-exclamation-triangle me-1"></i>Continuer malgré le conflit
                </button>
            </div>
        `;
        
        alertContainer.innerHTML = alertContent;
        
        // Trouver l'endroit où insérer l'alerte
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
            const parentElement = submitButton.closest('.d-grid');
            parentElement.parentNode.insertBefore(alertContainer, parentElement);
            
            // Scroll jusqu'à l'alerte
            alertContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Ajouter les écouteurs d'événements
            const resolveBtn = document.getElementById('resolve-conflict-btn');
            const ignoreBtn = document.getElementById('ignore-conflict-btn');
            
            if (resolveBtn) {
                resolveBtn.addEventListener('click', function() {
                    // Fermer l'alerte et défiler vers le haut du formulaire
                    alertContainer.remove();
                    document.getElementById('merchant-contains').scrollIntoView({ behavior: 'smooth', block: 'center' });
                    document.getElementById('merchant-contains').focus();
                });
            }
            
            if (ignoreBtn) {
                ignoreBtn.addEventListener('click', function() {
                    // Ajouter un champ caché pour indiquer d'ignorer les conflits
                    const ignoreConflictInput = document.createElement('input');
                    ignoreConflictInput.type = 'hidden';
                    ignoreConflictInput.name = 'ignore_conflicts';
                    ignoreConflictInput.value = 'true';
                    document.getElementById('rule-form').appendChild(ignoreConflictInput);
                    
                    // Fermer l'alerte et soumettre le formulaire
                    alertContainer.remove();
                    document.getElementById('rule-form').submit();
                });
            }
        }
    };

    /**
     * Valide le formulaire entier
     * @returns {boolean} true si le formulaire est valide, false sinon
     */
    Validation.validateForm = function() {
        let isValid = true;
        
        // Vérifier les champs de base (obligatoires toujours)
        const ruleName = document.getElementById('rule-name');
        const merchantContains = document.getElementById('merchant-contains');
        
        if (!ruleName.value.trim()) {
            Validation.showError(ruleName, 'Le nom de la règle est requis');
            isValid = false;
        } else {
            Validation.hideError(ruleName);
        }
        
        if (!merchantContains.value.trim()) {
            Validation.showError(merchantContains, 'Le filtre de marchand est requis');
            isValid = false;
        } else {
            Validation.hideError(merchantContains);
        }
        
        // Vérifier les sections conditionnelles (type, catégorie, renommage)
        const applyCategory = document.getElementById('apply-category');
        const applyFlag = document.getElementById('apply-flag');
        const applyRename = document.getElementById('apply-rename');
        
        if (applyCategory && applyCategory.checked) {
            const categoryId = document.getElementById('category-id');
            if (!categoryId.value) {
                Validation.showError(categoryId, 'Veuillez sélectionner une catégorie');
                isValid = false;
            } else {
                Validation.hideError(categoryId);
            }
        }
        
        if (applyFlag && applyFlag.checked) {
            const flagId = document.getElementById('flag-id');
            if (!flagId.value) {
                Validation.showError(flagId, 'Veuillez sélectionner un type de dépense');
                isValid = false;
            } else {
                Validation.hideError(flagId);
            }
        }
        
        if (applyRename && applyRename.checked) {
            const renamePattern = document.getElementById('rename-pattern');
            if (!renamePattern.value.trim()) {
                Validation.showError(renamePattern, 'Le motif de recherche est requis');
                isValid = false;
            } else {
                Validation.hideError(renamePattern);
            }
        }
        
        // Vérifier qu'au moins une action est activée
        if ((!applyCategory || !applyCategory.checked) && 
            (!applyFlag || !applyFlag.checked) && 
            (!applyRename || !applyRename.checked)) {
            
            // Afficher l'erreur actions
            const actionsError = document.getElementById('actions-error');
            if (actionsError) {
                actionsError.classList.remove('d-none');
            } else {
                // Créer le message d'erreur s'il n'existe pas
                const errorMsg = document.createElement('div');
                errorMsg.id = 'actions-error';
                errorMsg.className = 'alert alert-danger mb-3';
                errorMsg.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i>Veuillez activer au moins une action (catégorie, type ou renommage).';
                
                // Trouver l'endroit où insérer l'alerte
                const actionsSection = document.querySelector('.card-header h3.card-title');
                if (actionsSection && actionsSection.textContent.includes('Actions à appliquer')) {
                    const cardBody = actionsSection.closest('.card-header').nextElementSibling;
                    if (cardBody) {
                        cardBody.insertBefore(errorMsg, cardBody.firstChild);
                    }
                }
            }
            
            isValid = false;
        } else {
            // Masquer l'erreur actions si elle existe
            const actionsError = document.getElementById('actions-error');
            if (actionsError) {
                actionsError.classList.add('d-none');
            }
        }
        
        return isValid;
    };

    /**
     * Valide une section spécifique du formulaire
     * @param {HTMLElement} section - La section à valider
     * @param {boolean} isActive - Si la section est active
     * @returns {boolean} true si la section est valide, false sinon
     */
    Validation.validateSection = function(section, isActive) {
        if (!isActive) {
            // Si la section est inactive, masquer toutes les erreurs
            const errors = section.querySelectorAll('.validation-error');
            errors.forEach(error => {
                error.classList.remove('visible');
            });
            
            const invalidFields = section.querySelectorAll('.is-invalid');
            invalidFields.forEach(field => {
                field.classList.remove('is-invalid');
            });
            
            return true;
        }
        
        // Valider tous les champs requis dans cette section
        const requiredFields = section.querySelectorAll('[data-required="true"]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!Validation.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    };

    /**
     * Valide un champ spécifique
     * @param {HTMLElement} field - Le champ à valider
     * @returns {boolean} true si le champ est valide, false sinon
     */
    Validation.validateField = function(field) {
        if (!field) return true;
        
        // Vérifier si le champ est dans une section désactivée
        const section = field.closest('.rule-action-section');
        if (section) {
            const toggle = section.querySelector('.section-toggle');
            if (toggle && !toggle.checked) {
                Validation.hideError(field);
                return true;
            }
        }
        
        // Récupérer le message d'erreur associé au champ
        const errorId = field.id + '-error';
        const errorElement = document.getElementById(errorId);
        
        // Si c'est un select, vérifier si une option est sélectionnée
        if (field.tagName === 'SELECT') {
            if (!field.value) {
                if (errorElement) {
                    field.classList.add('is-invalid');
                    errorElement.classList.add('visible');
                } else {
                    Validation.showError(field, 'Ce champ est requis');
                }
                return false;
            }
        } 
        // Pour les autres types de champ, vérifier si la valeur n'est pas vide
        else if (!field.value.trim()) {
            if (errorElement) {
                field.classList.add('is-invalid');
                errorElement.classList.add('visible');
            } else {
                Validation.showError(field, 'Ce champ est requis');
            }
            return false;
        }
        
        // Le champ est valide, masquer l'erreur
        if (errorElement) {
            field.classList.remove('is-invalid');
            errorElement.classList.remove('visible');
        } else {
            Validation.hideError(field);
        }
        
        return true;
    };

    /**
     * Affiche un message d'erreur pour un champ
     * @param {HTMLElement} field - Le champ concerné
     * @param {string} message - Le message d'erreur à afficher
     */
    Validation.showError = function(field, message) {
        // Ajouter la classe d'erreur au champ
        field.classList.add('is-invalid');
        
        // Chercher un élément d'erreur existant
        const errorId = field.id + '-error';
        let errorElement = document.getElementById(errorId);
        
        // Si l'élément d'erreur n'existe pas, le créer
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = errorId;
            errorElement.className = 'validation-error';
            field.parentNode.appendChild(errorElement);
        }
        
        // Définir le message et afficher l'erreur
        errorElement.textContent = message;
        errorElement.classList.add('visible');
    };

    /**
     * Masque le message d'erreur pour un champ
     * @param {HTMLElement} field - Le champ concerné
     */
    Validation.hideError = function(field) {
        // Supprimer la classe d'erreur du champ
        field.classList.remove('is-invalid');
        
        // Chercher et masquer l'élément d'erreur
        const errorId = field.id + '-error';
        const errorElement = document.getElementById(errorId);
        
        if (errorElement) {
            errorElement.classList.remove('visible');
        }
    };
})();