// app/static/js/tricount/reimbursements/core.js
/**
 * Fonctionnalités de base pour le module de remboursements
 * Contient les fonctions essentielles et communes
 */

/**
 * Initialise les fonctionnalités de base
 */
export function initCore() {
    // Désactiver les comportements natifs qui causent des rafraîchissements
    disableNativeFormBehaviors();
    
    // Initialiser les tooltips
    initTooltips();
    
    // Prévenir les comportements par défaut des formulaires
    preventFormDefaults();
}

/**
 * Désactive les comportements qui causent des rafraîchissements de page
 */
function disableNativeFormBehaviors() {
    // Remplacer le gestionnaire de submit natif du navigateur
    document.querySelectorAll('form').forEach(form => {
        form.onsubmit = function(e) {
            e.preventDefault();
            return false;
        };
    });
    
    // Empêcher les clics sur les liens de reload
    document.querySelectorAll('a[href="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            return false;
        });
    });
    
    // Empêcher le mécanisme de submit du formulaire
    document.addEventListener('keydown', function(e) {
        if ((e.keyCode === 13 || e.key === 'Enter') && 
            (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
            e.preventDefault();
            return false;
        }
    }, true);
}

/**
 * Initialise les tooltips Bootstrap
 */
export function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Reconfigure les filtres pour qu'ils restent dans l'état demandé
 * sans causer de rechargement de page complet
 */
export function preventFormDefaults() {
    // Désactiver les comportements par défaut des boutons de formulaire
    document.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            return false;
        });
    });
    
    // Désactiver les comportements par défaut des filtres
    document.querySelectorAll('#filter-form select, #filter-form input[type="date"]').forEach(element => {
        element.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // Empêcher que le changement de date remonte la page
        if (element.type === 'date') {
            element.addEventListener('focus', function(e) {
                e.preventDefault();
                e.stopPropagation();
            });
            
            element.addEventListener('change', function(e) {
                e.preventDefault();
                e.stopPropagation();
            });
        }
    });
}

/**
 * Affiche un message d'erreur dans le tableau
 * @param {string} message - Message d'erreur à afficher
 */
export function showErrorMessage(message) {
    const tableBody = document.getElementById('expenses-table-body');
    
    if (!tableBody) return;
    
    // Créer une alerte d'erreur
    const alertHtml = `
        <tr>
            <td colspan="8" class="text-center py-4">
                <div class="alert alert-danger mb-0">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${message}
                </div>
            </td>
        </tr>
    `;
    
    tableBody.innerHTML = alertHtml;
}