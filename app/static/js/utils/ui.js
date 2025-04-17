// app/static/js/utils/ui.js
/**
 * Utilitaires génériques pour l'interface utilisateur
 * Fournit des fonctions réutilisables pour l'UI dans toute l'application
 */

/**
 * Initialise les tooltips Bootstrap
 * @param {string} selector - Sélecteur pour les éléments avec tooltip (défaut: '[data-bs-toggle="tooltip"]')
 */
export function initTooltips(selector = '[data-bs-toggle="tooltip"]') {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll(selector));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Initialise les popovers Bootstrap
 * @param {string} selector - Sélecteur pour les éléments avec popover (défaut: '[data-bs-toggle="popover"]')
 */
export function initPopovers(selector = '[data-bs-toggle="popover"]') {
    const popoverTriggerList = [].slice.call(document.querySelectorAll(selector));
    const popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

/**
 * Affiche une notification toast
 * @param {string} message - Message à afficher
 * @param {string} type - Type de toast (success, danger, warning, info)
 * @param {Object} options - Options supplémentaires
 */
export function showToast(message, type = 'info', options = {}) {
    // Configuration par défaut
    const config = {
        delay: 3000,
        autohide: true,
        position: 'top-end',
        ...options
    };
    
    // Créer un élément toast
    const toastContainer = document.getElementById('toast-container') || createToastContainer(config.position);
    
    // Créer le toast
    const toast = document.createElement('div');
    toast.className = `toast bg-${type} text-white`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Créer le contenu du toast
    toast.innerHTML = `
        <div class="toast-header bg-${type} text-white">
            <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Fermer"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Ajouter le toast au conteneur
    toastContainer.appendChild(toast);
    
    // Initialiser et afficher le toast
    const bsToast = new bootstrap.Toast(toast, {
        delay: config.delay,
        autohide: config.autohide
    });
    
    bsToast.show();
    
    // Supprimer le toast du DOM après qu'il soit caché
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

/**
 * Crée un conteneur pour les toasts
 * @param {string} position - Position du conteneur (top-end, top-start, bottom-end, bottom-start)
 * @returns {HTMLElement} Le conteneur créé
 */
function createToastContainer(position) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed p-3';
    
    // Définir la position
    switch (position) {
        case 'top-start':
            container.style.top = '0';
            container.style.left = '0';
            break;
        case 'top-end':
            container.style.top = '0';
            container.style.right = '0';
            break;
        case 'bottom-start':
            container.style.bottom = '0';
            container.style.left = '0';
            break;
        case 'bottom-end':
            container.style.bottom = '0';
            container.style.right = '0';
            break;
        default:
            container.style.top = '0';
            container.style.right = '0';
    }
    
    document.body.appendChild(container);
    return container;
}

/**
 * Affiche un indicateur de chargement
 * @param {HTMLElement|string} container - Conteneur ou sélecteur pour l'indicateur
 * @param {string} text - Texte à afficher (défaut: 'Chargement...')
 * @returns {HTMLElement} L'indicateur créé
 */
export function showLoadingIndicator(container, text = 'Chargement...') {
    const targetContainer = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
    
    if (!targetContainer) return null;
    
    // Créer l'indicateur
    const indicator = document.createElement('div');
    indicator.className = 'text-center my-3 loading-indicator';
    indicator.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">${text}</span>
        </div>
        <p class="mt-2">${text}</p>
    `;
    
    // Ajouter l'indicateur au conteneur
    targetContainer.appendChild(indicator);
    
    return indicator;
}

/**
 * Masque un indicateur de chargement
 * @param {HTMLElement} indicator - L'indicateur à masquer
 */
export function hideLoadingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
    }
}

/**
 * Affiche une confirmation avant une action
 * @param {string} message - Message de confirmation
 * @param {Object} options - Options supplémentaires
 * @returns {Promise} Promise résolu si l'utilisateur confirme
 */
export function confirmAction(message, options = {}) {
    // Configuration par défaut
    const config = {
        title: 'Confirmation',
        confirmText: 'Confirmer',
        cancelText: 'Annuler',
        confirmClass: 'btn-primary',
        cancelClass: 'btn-secondary',
        ...options
    };
    
    return new Promise((resolve, reject) => {
        // Créer la modal
        const modalId = 'confirm-action-modal';
        let modal = document.getElementById(modalId);
        
        // Supprimer l'ancienne modal si elle existe
        if (modal) {
            modal.remove();
        }
        
        // Créer une nouvelle modal
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('aria-hidden', 'true');
        
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${config.title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn ${config.cancelClass}" data-bs-dismiss="modal">${config.cancelText}</button>
                        <button type="button" class="btn ${config.confirmClass}" id="confirm-action-btn">${config.confirmText}</button>
                    </div>
                </div>
            </div>
        `;
        
        // Ajouter la modal au document
        document.body.appendChild(modal);
        
        // Initialiser la modal Bootstrap
        const bsModal = new bootstrap.Modal(modal);
        
        // Ajouter les écouteurs d'événements
        document.getElementById('confirm-action-btn').addEventListener('click', function() {
            bsModal.hide();
            resolve(true);
        });
        
        modal.addEventListener('hidden.bs.modal', function() {
            reject(new Error('Action annulée'));
        });
        
        // Afficher la modal
        bsModal.show();
    });
}