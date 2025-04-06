// app/static/js/tricount/auto_categorize/validation.js

// Ajouter cette fonction dans AutoCategorize.Validation

/**
 * Vérifie les conflits avec d'autres règles existantes
 * @returns {Promise<boolean>} true si des conflits existent, false sinon
 */
AutoCategorize.Validation.checkRuleConflicts = async function() {
    // Récupérer les données du formulaire
    const formData = AutoCategorize.getFilters ? AutoCategorize.getFilters() : {};
    
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
        
        if (data.success && data.conflicts && data.conflicts.length > 0) {
            // Afficher l'alerte de conflit
            AutoCategorize.Validation.showConflictAlert(data.conflicts);
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
AutoCategorize.Validation.showConflictAlert = function(conflicts) {
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

// Modifier la fonction validateForm pour vérifier les conflits
AutoCategorize.Validation.initConflictCheck = function() {
    const ruleForm = document.getElementById('rule-form');
    if (ruleForm) {
        // Remplacer l'événement de soumission existant
        ruleForm.removeEventListener('submit', AutoCategorize.Validation.onFormSubmit);
        ruleForm.addEventListener('submit', AutoCategorize.Validation.onFormSubmit);
    }
};

AutoCategorize.Validation.onFormSubmit = async function(event) {
    // Empêcher la soumission par défaut
    event.preventDefault();
    
    // Supprimer les alertes de conflit précédentes
    const existingAlert = document.getElementById('conflict-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Valider le formulaire
    if (AutoCategorize.Validation.validateForm()) {
        // Vérifier les conflits
        const hasConflicts = await AutoCategorize.Validation.checkRuleConflicts();
        
        // Si pas de conflits, soumettre le formulaire
        if (!hasConflicts) {
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

// Mettre à jour la fonction init pour initialiser la vérification des conflits
AutoCategorize.Validation.init = function() {
    // Ajouter la validation de champs aux éléments requis
    const requiredFields = document.querySelectorAll('[data-required="true"]');
    requiredFields.forEach(field => {
        field.addEventListener('input', function() {
            AutoCategorize.Validation.validateField(this);
        });
        
        field.addEventListener('change', function() {
            AutoCategorize.Validation.validateField(this);
        });
    });
    
    // Ajouter les écouteurs aux cases à cocher pour valider leur section
    const checkboxes = document.querySelectorAll('.section-toggle');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const sectionId = this.id.replace('apply-', '');
            const section = document.getElementById(`${sectionId}-section`);
            
            if (section) {
                AutoCategorize.Validation.validateSection(section, this.checked);
            }
        });
    });
    
    // Initialiser la vérification de conflits
    AutoCategorize.Validation.initConflictCheck();
};