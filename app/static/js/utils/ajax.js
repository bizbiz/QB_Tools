// app/static/js/utils/ajax.js
/**
 * Utilitaires génériques pour les requêtes AJAX
 * Fournit des fonctions réutilisables pour les requêtes AJAX dans l'application
 */

/**
 * Effectue une requête AJAX avec méthode POST
 * @param {string} url - URL de la requête
 * @param {FormData|Object} data - Données à envoyer (FormData ou objet)
 * @param {Object} options - Options supplémentaires
 * @returns {Promise} Promise avec le résultat de la requête
 */
export function post(url, data, options = {}) {
    // Configuration par défaut
    const config = {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        },
        ...options
    };
    
    // Gestion du body selon le type de données
    if (data instanceof FormData) {
        config.body = data;
    } else if (typeof data === 'object') {
        config.body = JSON.stringify(data);
        config.headers['Content-Type'] = 'application/json';
    }
    
    // Exécuter la requête
    return fetch(url, config)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            return response.json();
        });
}

/**
 * Effectue une requête AJAX avec méthode GET
 * @param {string} url - URL de la requête
 * @param {Object} params - Paramètres de la requête (convertis en query string)
 * @param {Object} options - Options supplémentaires
 * @returns {Promise} Promise avec le résultat de la requête
 */
export function get(url, params = {}, options = {}) {
    // Ajouter les paramètres à l'URL
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    // Configuration par défaut
    const config = {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        },
        ...options
    };
    
    // Exécuter la requête
    return fetch(fullUrl, config)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            return response.json();
        });
}

/**
 * Soumet un formulaire via AJAX
 * @param {HTMLFormElement} form - Formulaire à soumettre
 * @param {Object} options - Options supplémentaires
 * @returns {Promise} Promise avec le résultat de la requête
 */
export function submitForm(form, options = {}) {
    // Créer un FormData à partir du formulaire
    const formData = new FormData(form);
    
    // Ajouter un indicateur AJAX
    formData.append('ajax', 'true');
    
    // Configuration par défaut
    const config = {
        method: form.method || 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        },
        ...options
    };
    
    // Définir le body
    config.body = formData;
    
    // Exécuter la requête
    return fetch(form.action, config)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            return response.json();
        });
}

/**
 * Affiche un indicateur de chargement pendant une requête AJAX
 * @param {Promise} promise - Promise de la requête AJAX
 * @param {HTMLElement} loadingElement - Élément à afficher pendant le chargement
 * @returns {Promise} Promise initiale
 */
export function withLoader(promise, loadingElement) {
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }
    
    return promise.finally(() => {
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    });
}

/**
 * Effectue une requête avec un délai (debounce)
 * @param {Function} requestFn - Fonction qui effectue la requête
 * @param {number} delay - Délai en millisecondes
 * @returns {Function} Fonction avec debounce
 */
export function debounce(requestFn, delay = 300) {
    let timeout = null;
    
    return function(...args) {
        if (timeout) {
            clearTimeout(timeout);
        }
        
        return new Promise((resolve) => {
            timeout = setTimeout(() => {
                resolve(requestFn(...args));
            }, delay);
        });
    };
}