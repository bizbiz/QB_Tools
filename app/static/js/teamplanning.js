// app/static/js/teamplanning.js

/**
 * Gestion du cookie d'authentification de Netplanning
 */
class CookieManager {
    constructor(cookieName = 'netplanning_auth') {
        this.COOKIE_NAME = cookieName;
    }
    
    /**
     * Récupère la valeur du cookie
     * @returns {string|null} Valeur du cookie ou null si non trouvé
     */
    getCookie() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === this.COOKIE_NAME) {
                return decodeURIComponent(value);
            }
        }
        return null;
    }
    
    /**
     * Définit la valeur du cookie avec une expiration d'un an
     * @param {string} value - Valeur à stocker dans le cookie
     */
    setCookie(value) {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        document.cookie = `${this.COOKIE_NAME}=${encodeURIComponent(value)};expires=${expiryDate.toUTCString()};path=/;SameSite=Strict`;
    }
}

/**
 * Gestion de la modal pour le cookie
 */
class CookieModal {
    constructor(cookieManager) {
        this.cookieManager = cookieManager;
        this.modal = document.getElementById('cookie-modal');
        this.closeButton = document.getElementById('close-modal');
        this.cancelButton = document.getElementById('cancel-cookie');
        this.saveButton = document.getElementById('save-cookie');
        this.cookieInput = document.getElementById('cookie-value');
        this.manageButton = document.getElementById('manage-cookie');
        
        this.initEventListeners();
    }
    
    /**
     * Initialise les écouteurs d'événements pour la modal
     */
    initEventListeners() {
        if (this.manageButton) {
            this.manageButton.addEventListener('click', () => this.show());
        }
        
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.hide());
        }
        
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => this.hide());
        }
        
        if (this.saveButton) {
            this.saveButton.addEventListener('click', () => this.saveCookie());
        }
    }
    
    /**
     * Affiche la modal et remplit le champ avec la valeur du cookie existant
     */
    show() {
        const currentCookie = this.cookieManager.getCookie();
        if (currentCookie && this.cookieInput) {
            this.cookieInput.value = currentCookie;
        }
        if (this.modal) {
            this.modal.style.display = 'block';
        }
    }
    
    /**
     * Cache la modal
     */
    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
    
    /**
     * Sauvegarde la valeur du cookie et cache la modal
     */
    saveCookie() {
        if (!this.cookieInput) return;
        
        const cookieValue = this.cookieInput.value.trim();
        if (cookieValue) {
            this.cookieManager.setCookie(cookieValue);
            this.hide();
            UI.showStatusMessage('success', 'Cookie sauvegardé avec succès.');
        } else {
            UI.showStatusMessage('error', 'Veuillez entrer un cookie valide.');
        }
    }
}

/**
 * Classe pour gérer l'interface utilisateur
 */
class UI {
    /**
     * Affiche un message de statut dans l'élément spécifié
     * @param {string} type - Type de message ('success' ou 'error')
     * @param {string} message - Texte du message
     * @param {HTMLElement} element - Élément où afficher le message
     */
    static showStatusMessage(type, message, element = document.getElementById('status-message')) {
        if (!element) return;
        
        element.innerHTML = `
            <div class="alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show mt-3" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
    
    /**
     * Affiche un spinner de chargement
     * @param {HTMLElement} spinner - Élément spinner à afficher
     */
    static showSpinner(spinner) {
        if (spinner) {
            spinner.style.display = 'block';
        }
    }
    
    /**
     * Cache un spinner de chargement
     * @param {HTMLElement} spinner - Élément spinner à cacher
     */
    static hideSpinner(spinner) {
        if (spinner) {
            spinner.style.display = 'none';
        }
    }
    
    /**
     * Initialise et affiche le conteneur des étapes du processus
     * @param {string} containerId - ID du conteneur des étapes
     * @param {Array} steps - Tableau des étapes à afficher
     */
    static initProcessSteps(containerId, steps) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Afficher le conteneur
        container.style.display = 'block';
        
        // Récupérer la liste des étapes
        const stepsList = container.querySelector('.steps-list');
        if (!stepsList) return;
        
        // Vider la liste existante
        stepsList.innerHTML = '';
        
        // Ajouter chaque étape
        steps.forEach(step => {
            const stepElement = document.createElement('div');
            stepElement.id = `step-${step.id}`;
            stepElement.className = 'process-step process-step-pending';
            stepElement.innerHTML = `
                <span class="step-name">${step.name}</span>
                <div class="step-status">
                    <span class="badge bg-secondary">En attente</span>
                </div>
            `;
            stepsList.appendChild(stepElement);
        });
    }
    
    /**
     * Met à jour le statut d'une étape du processus
     * @param {string} stepId - ID de l'étape à mettre à jour
     * @param {string} status - Statut ('pending', 'active', 'completed', 'error')
     * @param {string} message - Message à afficher (optionnel)
     */
    static updateStepStatus(stepId, status, message = '') {
        const stepElement = document.getElementById(`step-${stepId}`);
        if (!stepElement) return;
        
        // Mettre à jour la classe CSS
        stepElement.className = `process-step process-step-${status}`;
        
        // Mettre à jour le contenu selon le statut
        const statusElement = stepElement.querySelector('.step-status');
        if (!statusElement) return;
        
        switch (status) {
            case 'pending':
                statusElement.innerHTML = `<span class="badge bg-secondary">En attente</span>`;
                break;
            case 'active':
                statusElement.innerHTML = `
                    <span class="me-2">${message || 'En cours...'}</span>
                    <div class="spinner-border spinner-border-sm step-spinner text-primary" role="status">
                        <span class="visually-hidden">Chargement...</span>
                    </div>
                `;
                break;
            case 'completed':
                statusElement.innerHTML = `
                    <span class="me-2">${message || 'Terminé'}</span>
                    <i class="fas fa-check-circle text-success step-icon"></i>
                `;
                break;
            case 'error':
                statusElement.innerHTML = `
                    <span class="me-2">${message || 'Erreur'}</span>
                    <i class="fas fa-times-circle text-danger step-icon"></i>
                `;
                break;
        }
    }
}

/**
 * Classe pour gérer les appels API
 */
class API {
    /**
     * Récupère les données du planning depuis Netplanning
     * @param {string} cookie - Valeur du cookie d'authentification
     * @returns {Promise} Promesse contenant la réponse de l'API
     */
    static async fetchNetplanning(cookie) {
        return fetch('/teamplanning/fetch-netplanning', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cookie: cookie })
        }).then(response => response.json());
    }
    
    /**
     * Extrait les utilisateurs du dernier planning récupéré
     * @returns {Promise} Promesse contenant la réponse de l'API
     */
    static async extractUsers() {
        return fetch('/teamplanning/extract-users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }).then(response => response.json());
    }
}

/**
 * Classe principale pour la page Teamplanning
 */
class Teamplanning {
    constructor() {
        this.cookieManager = new CookieManager();
        this.cookieModal = new CookieModal(this.cookieManager);
        
        this.fetchButton = document.getElementById('fetch-netplanning');
        this.processDataButton = document.getElementById('process-data');
        this.loadingSpinner = document.getElementById('loading-spinner');
        this.processSpinner = document.getElementById('process-spinner');
        this.netplanningContent = document.getElementById('netplanning-content');
        this.rawContent = document.getElementById('raw-content');
        this.usersList = document.getElementById('users-list');
        
        this.initEventListeners();
    }
    
    /**
     * Initialise les écouteurs d'événements
     */
    initEventListeners() {
        if (this.fetchButton) {
            this.fetchButton.addEventListener('click', () => this.fetchNetplanning());
        }
        
        if (this.processDataButton) {
            this.processDataButton.addEventListener('click', () => this.processData());
        }
    }
    
    /**
     * Récupère les données depuis Netplanning
     */
    async fetchNetplanning() {
        const cookieValue = this.cookieManager.getCookie();
        
        if (!cookieValue) {
            UI.showStatusMessage('error', 'Cookie d\'authentification non trouvé. Veuillez configurer votre cookie.');
            this.cookieModal.show();
            return;
        }
        
        // Afficher le spinner de chargement
        UI.showSpinner(this.loadingSpinner);
        if (this.netplanningContent) {
            this.netplanningContent.classList.add('d-none');
        }
        
        try {
            const data = await API.fetchNetplanning(cookieValue);
            
            // Cacher le spinner de chargement
            UI.hideSpinner(this.loadingSpinner);
            
            if (data.success) {
                // Vérifier si le contenu semble être une page de login
                if (data.content.includes('connexion') && data.content.includes('mot de passe')) {
                    UI.showStatusMessage('error', 'Le cookie semble être expiré. Veuillez mettre à jour votre cookie.');
                    this.cookieModal.show();
                } else {
                    // Afficher le contenu
                    if (this.rawContent) {
                        this.rawContent.textContent = data.content.substring(0, 5000) + '...'; // Limiter l'affichage
                    }
                    if (this.netplanningContent) {
                        this.netplanningContent.classList.remove('d-none');
                    }
                    
                    if (data.parsed) {
                        UI.showStatusMessage('success', `Données récupérées et analysées avec succès! <a href="${window.location.pathname}view-planning/${data.parsed_planning_id}" class="alert-link">Voir le planning</a>`);
                    } else if (data.is_new) {
                        UI.showStatusMessage('success', 'Nouvelles données récupérées avec succès!');
                    } else {
                        UI.showStatusMessage('success', 'Données récupérées avec succès (aucun changement détecté).');
                    }
                    
                    // Recharger la page pour mettre à jour le timestamp
                    setTimeout(() => window.location.reload(), 2000);
                }
            } else {
                UI.showStatusMessage('error', data.error || 'Erreur lors de la récupération des données.');
            }
        } catch (error) {
            UI.hideSpinner(this.loadingSpinner);
            UI.showStatusMessage('error', 'Erreur de connexion au serveur.');
            console.error('Fetch error:', error);
        }
    }
    
    /**
     * Traite les données pour extraire les utilisateurs
     */
    async processData() {
        // Afficher le spinner de traitement
        UI.showSpinner(this.processSpinner);
        
        try {
            const data = await API.extractUsers();
            
            // Cacher le spinner de traitement
            UI.hideSpinner(this.processSpinner);
            
            if (data.success) {
                UI.showStatusMessage('success', 'Données traitées avec succès!', document.getElementById('process-status-message'));
                
                // Afficher la liste des utilisateurs
                if (data.users && data.users.length > 0) {
                    let usersHtml = '<ul class="list-group">';
                    data.users.forEach(user => {
                        usersHtml += `<li class="list-group-item">${user}</li>`;
                    });
                    usersHtml += '</ul>';
                    if (this.usersList) {
                        this.usersList.innerHTML = usersHtml;
                    }
                } else {
                    if (this.usersList) {
                        this.usersList.innerHTML = '<div class="alert alert-warning">Aucun utilisateur trouvé dans les données.</div>';
                    }
                }
            } else {
                UI.showStatusMessage('error', data.error || 'Erreur lors du traitement des données.', document.getElementById('process-status-message'));
            }
        } catch (error) {
            UI.hideSpinner(this.processSpinner);
            UI.showStatusMessage('error', 'Erreur de connexion au serveur.', document.getElementById('process-status-message'));
            console.error('Process error:', error);
        }
    }
}

// Initialiser l'application lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    new Teamplanning();
});