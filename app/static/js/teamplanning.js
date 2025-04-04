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
     * Extrait les événements du planning
     * @param {Object} options - Options de l'extraction
     * @returns {Promise} Promesse contenant la réponse de l'API
     */
    static async extractEvents(options = {}) {
        return fetch('/teamplanning/extract-events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(options)
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
    
    /**
     * Extrait les informations de dates du planning
     * @returns {Promise} Promesse contenant la réponse de l'API
     */
    static async extractDates() {
        return fetch('/teamplanning/extract-dates', {
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
        // Définir les étapes du traitement
        const processSteps = [
            { id: 'extract-users', name: 'Extraction des utilisateurs' },
            { id: 'extract-dates', name: 'Extraction des dates & vérifications' },
            { id: 'extract-events', name: 'Extraction des événements' },
            // Ajouter d'autres étapes au fur et à mesure du développement
            // Par exemple: { id: 'analyze-schedule', name: 'Analyse des plannings' },
        ];
        
        // Initialiser l'affichage des étapes
        UI.initProcessSteps('process-steps', processSteps);
        
        // Afficher le spinner global
        UI.showSpinner(this.processSpinner);
        
        try {
            // Étape 1: Extraction des utilisateurs
            UI.updateStepStatus('extract-users', 'active');
            
            const userData = await API.extractUsers();
            
            if (userData.success) {
                // Marquer l'étape comme complétée
                UI.updateStepStatus('extract-users', 'completed', `${userData.count} utilisateurs trouvés`);
                
                // Afficher la liste des utilisateurs
                if (userData.users && userData.users.length > 0) {
                    let usersHtml = '<ul class="list-group">';
                    userData.users.forEach(user => {
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
                
                // Étape 2: Extraction des dates
                UI.updateStepStatus('extract-dates', 'active');
                
                const datesData = await API.extractDates();
                
                if (datesData.success) {
                    // Vérifier la cohérence des dates
                    let statusMessage = datesData.summary || "Analyse terminée";
                    let statusType = 'completed';
                    
                    if (datesData.verification && !datesData.verification.is_consistent) {
                        statusType = 'error';
                        statusMessage = datesData.verification.message;
                    }
                    
                    // Afficher les informations de débogage dans la console
                    if (datesData.debug) {
                        console.log("Informations de débogage des dates:", datesData.debug);
                    }
                    
                    // Marquer l'étape comme complétée
                    UI.updateStepStatus('extract-dates', statusType, statusMessage);
                    
                    // Étape 3: Extraction des événements
                    UI.updateStepStatus('extract-events', 'active');
                    
                    // Options pour limiter l'extraction au premier utilisateur, première ligne
                    const eventOptions = {
                        first_user_only: true,
                        first_line_only: true
                    };
                    
                    const eventsData = await API.extractEvents({
                        first_user_only: false,  // Modifié pour récupérer tous les utilisateurs
                        first_line_only: false   // Modifié pour récupérer tous les créneaux horaires
                    });
                    
                    if (eventsData.success) {
                        // Déterminer le message de statut
                        const eventsCount = eventsData.summary?.events_count || 0;
                        const usersCount = eventsData.summary?.users_count || 0;
                        
                        let eventsStatusMessage = `${eventsCount} événements extraits pour ${usersCount} utilisateur`;
                        
                        // Afficher les types d'événements extraits
                        const eventTypes = eventsData.summary?.event_types || {};
                        if (Object.keys(eventTypes).length > 0) {
                            const typesText = Object.entries(eventTypes)
                                .map(([type, count]) => `${count} ${type}`)
                                .join(', ');
                            eventsStatusMessage += ` (${typesText})`;
                        }

                        if (eventsData.events_log) {
                            this.displayEventsLog(eventsData.events_log);
                        }

                        // Afficher des informations de débogage supplémentaires
                        if (eventsData.summary && eventsData.summary.extracted_days) {
                            console.log("Jours extraits:", eventsData.summary.extracted_days);
                            console.log("Nombre d'événements par jour:", eventsData.summary.events_by_day);
                            console.log("Événements jour 3:", eventsData.summary.day_3_events);
                        }
                                                
                        UI.updateStepStatus('extract-events', 'completed', eventsStatusMessage);
                        
                        // Stocker les données d'événements pour utilisation ultérieure
                        this.eventsData = eventsData.events;
                    } else {
                        UI.updateStepStatus('extract-events', 'error', 'Échec de l\'extraction');
                    }
                } else {
                    // En cas d'erreur dans cette étape
                    UI.updateStepStatus('extract-dates', 'error', 'Échec de l\'extraction');
                    UI.updateStepStatus('extract-events', 'pending');
                }
                
                // Message de succès global
                UI.showStatusMessage('success', 'Traitement des données terminé avec succès!', document.getElementById('process-status-message'));
            } else {
                // En cas d'erreur dans la première étape
                UI.updateStepStatus('extract-users', 'error', 'Échec de l\'extraction');
                UI.updateStepStatus('extract-dates', 'pending');
                UI.showStatusMessage('error', userData.error || 'Erreur lors du traitement des données.', document.getElementById('process-status-message'));
            }
            
            // Ici, vous pourriez ajouter d'autres étapes au fur et à mesure du développement
            // Par exemple: Analyse des plannings, génération de rapports, etc.
            
        } catch (error) {
            // Gestion des erreurs générales
            UI.updateStepStatus('extract-users', 'error', 'Erreur de connexion');
            UI.updateStepStatus('extract-dates', 'error', 'Non exécuté');
            UI.showStatusMessage('error', 'Erreur de connexion au serveur.', document.getElementById('process-status-message'));
            console.error('Process error:', error);
        } finally {
            // Toujours cacher le spinner global à la fin
            UI.hideSpinner(this.processSpinner);
        }
    }

    /**
     * Affiche le journal des événements extraits
     * @param {Array} eventsLog - Liste des événements
     */
    displayEventsLog(eventsLog) {
        const eventsLogContainer = document.getElementById('events-log');
        if (!eventsLogContainer) return;
        
        console.log("Événements reçus pour affichage:", eventsLog);
        
        if (!eventsLog || eventsLog.length === 0) {
            eventsLogContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Aucun événement extrait.
                </div>
            `;
            return;
        }
        
        // Extraire la liste des utilisateurs uniques
        const users = [...new Set(eventsLog.map(event => event.user))].sort();
        
        // Créer un sélecteur d'utilisateur
        let logHtml = `
            <div class="form-group mb-3">
                <label for="user-filter-select" class="form-label">Filtrer par utilisateur:</label>
                <select id="user-filter-select" class="form-select">
                    <option value="all">Tous les utilisateurs (${users.length})</option>
        `;
        
        // Ajouter une option pour chaque utilisateur
        users.forEach(user => {
            logHtml += `<option value="${user}">${user}</option>`;
        });
        
        logHtml += `
                </select>
            </div>
        `;
        
        // Créer le tableau pour afficher les événements
        logHtml += `
            <div class="table-responsive">
                <table class="table table-sm table-hover">
                    <thead>
                        <tr>
                            <th>Utilisateur</th>
                            <th>Jour</th>
                            <th>Moment</th>
                            <th>Contenu</th>
                            <th>Type</th>
                            <th>Commentaire</th>
                            <th>Dernière modif.</th>
                        </tr>
                    </thead>
                    <tbody id="events-table-body">
        `;
        
        // Définir les noms français des créneaux horaires
        const timeSlotNames = {
            'morning': 'Matin',
            'day': 'Journée',
            'evening': 'Soir'
        };
        
        const eventTypeNames = {
            'telework': 'Télétravail',
            'tele_maintenance': 'Télémaintenance',
            'meeting': 'Réunion',
            'route': 'Route',
            'preventive': 'Préventive',
            'preventive_fixed': 'Préventive fixée',
            'preventive_meditech': 'Préventive Meditech',
            'preventive_meditech_fixed': 'Préventive Meditech fixée',
            'corrective': 'Corrective',
            'corrective_fixed': 'Corrective fixée',
            'paid_leave': 'Congés payés',
            'half_paid_leave': 'Demi congés payés',
            'special_leave': 'Congés spéciaux',
            'rtt': 'RTT',
            'half_rtt': 'Demi RTT',
            'compensatory': 'Récupération',
            'compensatory_rest': 'Repos compensateur',
            'stock_management': 'Gestion de stock',
            'commissioning': 'Mise en service',
            'installation': 'Installation',
            'training': 'Formation',
            'tech_training': 'Formation technique',
            'office': 'Bureau',
            'dismantling': 'Démontage',
            'vacation': 'Congés',
            'duty': 'Permanence',
            'onsite': 'Sur site',
            'leave': 'Congés posés',
            'holiday': 'Jour férié',
            'weekend': 'Week-end',
            'comment': 'Commentaire',
            'empty': 'Vide',
            'unknown': 'Inconnu',
            'other': 'Autre'
        };

        const typeClasses = {
            'telework': 'success',
            'tele_maintenance': 'success',
            'meeting': 'primary',
            'route': 'warning',
            'preventive': 'info',
            'preventive_fixed': 'info',
            'preventive_meditech': 'info',
            'preventive_meditech_fixed': 'info',
            'corrective': 'danger',
            'corrective_fixed': 'danger',
            'paid_leave': 'secondary',
            'half_paid_leave': 'secondary',
            'special_leave': 'secondary',
            'rtt': 'secondary',
            'half_rtt': 'secondary',
            'compensatory': 'secondary',
            'compensatory_rest': 'secondary',
            'stock_management': 'dark',
            'commissioning': 'dark',
            'installation': 'dark',
            'training': 'primary',
            'tech_training': 'primary',
            'office': 'dark',
            'dismantling': 'dark',
            'vacation': 'secondary',
            'duty': 'info',
            'onsite': 'dark',
            'leave': 'secondary',
            'holiday': 'success',
            'weekend': 'secondary',
            'comment': 'info',
            'empty': 'light',
            'unknown': 'light',
            'other': 'dark'
        };
        
        // Stocker tous les événements dans une variable globale pour le filtrage
        window.allEvents = eventsLog;
        // Par défaut, afficher les 100 premiers événements
        window.displayedEvents = eventsLog.slice(0, 99000);
        
        let rowsHtml = '';
        
        // Générer les lignes pour les événements affichés
        window.displayedEvents.forEach(event => {
            const rowClass = event.is_weekend ? 'table-secondary' : '';
            const typeClass = typeClasses[event.type] || 'secondary';
            
            rowsHtml += `
                <tr class="${rowClass}" data-user="${event.user}">
                    <td>${event.user}</td>
                    <td>${event.day}</td>
                    <td>${timeSlotNames[event.time_slot] || event.time_slot}</td>
                    <td>${event.content || '-'}</td>
                    <td><span class="badge bg-${typeClass}">${eventTypeNames[event.type] || event.type}</span></td>
                    <td>${event.comment || '-'}</td>
                    <td>${event.last_modified ? `${event.last_modified}<br>${event.author || ''}` : '-'}</td>
                </tr>
            `;
        });
        
        logHtml += rowsHtml + `
                    </tbody>
                </table>
            </div>
        `;
        
        // Ajouter un message si tous les événements ne sont pas affichés
        if (eventsLog.length > 100) {
            logHtml += `
                <div class="alert alert-info mt-2" id="display-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Affichage limité aux 100 premiers événements sur ${eventsLog.length} au total.
                    Sélectionnez un utilisateur spécifique pour voir tous ses événements.
                </div>
            `;
        }
        
        // Ajouter un bouton pour charger plus d'événements
        logHtml += `
            <div class="text-center mt-3">
                <button id="load-more-events" class="btn btn-outline-primary">
                    <i class="fas fa-plus-circle me-2"></i>Charger plus d'événements
                </button>
            </div>
        `;
        
        eventsLogContainer.innerHTML = logHtml;
        
        // Ajouter les écouteurs d'événements
        this.setupEventListeners(timeSlotNames, eventTypeNames, typeClasses);
    }

    setupEventListeners(timeSlotNames, eventTypeNames, typeClasses) {
        // Ajouter l'écouteur pour le sélecteur d'utilisateur
        const userFilterSelect = document.getElementById('user-filter-select');
        if (userFilterSelect) {
            userFilterSelect.addEventListener('change', () => {
                const selectedUser = userFilterSelect.value;
                this.filterEventsByUser(selectedUser, timeSlotNames, eventTypeNames, typeClasses);
            });
        }
        
        // Ajouter l'écouteur pour le bouton "Charger plus"
        const loadMoreButton = document.getElementById('load-more-events');
        if (loadMoreButton) {
            loadMoreButton.addEventListener('click', () => {
                this.loadMoreEvents(timeSlotNames, eventTypeNames, typeClasses);
            });
        }
    }

    filterEventsByUser(selectedUser, timeSlotNames, eventTypeNames, typeClasses) {
        const tableBody = document.getElementById('events-table-body');
        if (!tableBody || !window.allEvents) return;
        
        let filteredEvents;
        
        if (selectedUser === 'all') {
            // Pour "Tous les utilisateurs", limiter à 100 événements
            filteredEvents = window.allEvents.slice(0, 100);
        } else {
            // Pour un utilisateur spécifique, montrer tous ses événements
            filteredEvents = window.allEvents.filter(event => event.user === selectedUser);
        }
        
        window.displayedEvents = filteredEvents;
        
        let rowsHtml = '';
        filteredEvents.forEach(event => {
            const rowClass = event.is_weekend ? 'table-secondary' : '';
            const typeClass = typeClasses[event.type] || 'secondary';
            
            rowsHtml += `
                <tr class="${rowClass}" data-user="${event.user}">
                    <td>${event.user}</td>
                    <td>${event.day}</td>
                    <td>${timeSlotNames[event.time_slot] || event.time_slot}</td>
                    <td>${event.content || '-'}</td>
                    <td><span class="badge bg-${typeClass}">${eventTypeNames[event.type] || event.type}</span></td>
                    <td>${event.comment || '-'}</td>
                    <td>${event.last_modified ? `${event.last_modified}<br>${event.author || ''}` : '-'}</td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = rowsHtml;
        
        // Mettre à jour le message d'information
        const displayInfo = document.getElementById('display-info');
        if (displayInfo) {
            if (selectedUser === 'all' && window.allEvents.length > 100) {
                displayInfo.innerHTML = `
                    <i class="fas fa-info-circle me-2"></i>
                    Affichage limité aux 100 premiers événements sur ${window.allEvents.length} au total.
                    Sélectionnez un utilisateur spécifique pour voir tous ses événements.
                `;
                displayInfo.style.display = 'block';
            } else if (selectedUser !== 'all') {
                const userEventCount = window.allEvents.filter(e => e.user === selectedUser).length;
                displayInfo.innerHTML = `
                    <i class="fas fa-info-circle me-2"></i>
                    Affichage des ${filteredEvents.length} événements pour ${selectedUser}.
                `;
                displayInfo.style.display = 'block';
            } else {
                displayInfo.style.display = 'none';
            }
        }
        
        // Gérer l'affichage du bouton "Charger plus"
        const loadMoreButton = document.getElementById('load-more-events');
        if (loadMoreButton) {
            if (selectedUser === 'all' && window.displayedEvents.length < window.allEvents.length) {
                loadMoreButton.style.display = 'inline-block';
            } else {
                loadMoreButton.style.display = 'none';
            }
        }
    }

    loadMoreEvents(timeSlotNames, eventTypeNames, typeClasses) {
        const tableBody = document.getElementById('events-table-body');
        if (!tableBody || !window.allEvents || !window.displayedEvents) return;
        
        const currentCount = window.displayedEvents.length;
        const nextBatch = window.allEvents.slice(currentCount, currentCount + 100);
        
        if (nextBatch.length === 0) return;
        
        window.displayedEvents = [...window.displayedEvents, ...nextBatch];
        
        let rowsHtml = '';
        window.displayedEvents.forEach(event => {
            const rowClass = event.is_weekend ? 'table-secondary' : '';
            const typeClass = typeClasses[event.type] || 'secondary';
            
            rowsHtml += `
                <tr class="${rowClass}" data-user="${event.user}">
                    <td>${event.user}</td>
                    <td>${event.day}</td>
                    <td>${timeSlotNames[event.time_slot] || event.time_slot}</td>
                    <td>${event.content || '-'}</td>
                    <td><span class="badge bg-${typeClass}">${eventTypeNames[event.type] || event.type}</span></td>
                    <td>${event.comment || '-'}</td>
                    <td>${event.last_modified ? `${event.last_modified}<br>${event.author || ''}` : '-'}</td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = rowsHtml;
        
        // Mettre à jour le message d'information
        const displayInfo = document.getElementById('display-info');
        if (displayInfo) {
            displayInfo.innerHTML = `
                <i class="fas fa-info-circle me-2"></i>
                Affichage de ${window.displayedEvents.length} événements sur ${window.allEvents.length} au total.
            `;
        }
        
        // Masquer le bouton s'il n'y a plus d'événements à charger
        const loadMoreButton = document.getElementById('load-more-events');
        if (loadMoreButton && window.displayedEvents.length >= window.allEvents.length) {
            loadMoreButton.style.display = 'none';
        }
    }
}

// Initialiser l'application lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    new Teamplanning();
});