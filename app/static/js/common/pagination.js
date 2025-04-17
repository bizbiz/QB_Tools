// app/static/js/common/pagination.js
/**
 * Module de pagination réutilisable
 * Fournit des fonctionnalités de pagination pour toute l'application
 */

/**
 * Crée une pagination basée sur des données
 * @param {Object} paginationData - Données de pagination (page, pages, has_prev, has_next, prev_num, next_num)
 * @param {string} containerSelector - Sélecteur du conteneur de pagination
 * @param {Function} onPageChange - Fonction à appeler lors du changement de page
 */
export function createPagination(paginationData, containerSelector, onPageChange) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    // Si pas de pages ou une seule page, masquer la pagination
    if (!paginationData || paginationData.pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    // Créer l'élément de pagination
    let html = '<ul class="pagination justify-content-center">';
    
    // Bouton précédent
    if (paginationData.has_prev) {
        html += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="${paginationData.prev_num}">
                    <i class="fas fa-chevron-left"></i> Précédent
                </a>
            </li>
        `;
    } else {
        html += `
            <li class="page-item disabled">
                <span class="page-link"><i class="fas fa-chevron-left"></i> Précédent</span>
            </li>
        `;
    }
    
    // Calculer les pages à afficher
    let startPage = Math.max(paginationData.page - 2, 1);
    let endPage = Math.min(startPage + 4, paginationData.pages);
    startPage = Math.max(endPage - 4, 1);
    
    // Pages numérotées
    for (let i = startPage; i <= endPage; i++) {
        if (i === paginationData.page) {
            html += `
                <li class="page-item active">
                    <span class="page-link">${i}</span>
                </li>
            `;
        } else {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
    }
    
    // Bouton suivant
    if (paginationData.has_next) {
        html += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="${paginationData.next_num}">
                    Suivant <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
    } else {
        html += `
            <li class="page-item disabled">
                <span class="page-link">Suivant <i class="fas fa-chevron-right"></i></span>
            </li>
        `;
    }
    
    html += '</ul>';
    
    // Mettre à jour le contenu
    container.innerHTML = html;
    
    // Ajouter les écouteurs d'événements
    const pageLinks = container.querySelectorAll('.page-link:not(.disabled)');
    pageLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.dataset.page);
            if (typeof onPageChange === 'function') {
                onPageChange(page);
            }
        });
    });
}

/**
 * Initialise la pagination avec AJAX
 * @param {string} paginationSelector - Sélecteur pour les liens de pagination
 * @param {Function} updateFunction - Fonction à appeler pour mettre à jour le contenu
 */
export function initAjaxPagination(paginationSelector, updateFunction) {
    const paginationLinks = document.querySelectorAll(`${paginationSelector} .page-link:not(.disabled)`);
    
    paginationLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const page = this.dataset.page || '1';
            
            if (typeof updateFunction === 'function') {
                updateFunction(page);
            }
            
            return false;
        });
    });
}

/**
 * Met à jour la pagination avec de nouvelles données
 * @param {Object} paginationData - Données de pagination
 * @param {string} containerSelector - Sélecteur du conteneur de pagination
 */
export function updatePagination(paginationData, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    // Si pas de pages, masquer la pagination
    if (!paginationData || paginationData.pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    // Mettre à jour les numéros de page actifs
    const pageItems = container.querySelectorAll('.page-item');
    pageItems.forEach(item => {
        item.classList.remove('active');
        
        const pageLink = item.querySelector('.page-link');
        if (pageLink && pageLink.dataset.page === paginationData.page.toString()) {
            item.classList.add('active');
        }
    });
    
    // Mettre à jour les liens précédent/suivant
    const prevLink = container.querySelector('.page-link[rel="prev"]');
    if (prevLink) {
        const prevItem = prevLink.parentElement;
        if (paginationData.has_prev) {
            prevItem.classList.remove('disabled');
            prevLink.dataset.page = paginationData.prev_num;
        } else {
            prevItem.classList.add('disabled');
        }
    }
    
    const nextLink = container.querySelector('.page-link[rel="next"]');
    if (nextLink) {
        const nextItem = nextLink.parentElement;
        if (paginationData.has_next) {
            nextItem.classList.remove('disabled');
            nextLink.dataset.page = paginationData.next_num;
        } else {
            nextItem.classList.add('disabled');
        }
    }
}

/**
 * Génère les données de pagination
 * @param {number} totalItems - Nombre total d'éléments
 * @param {number} itemsPerPage - Nombre d'éléments par page
 * @param {number} currentPage - Page actuelle
 * @returns {Object} Données de pagination
 */
export function generatePaginationData(totalItems, itemsPerPage, currentPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const page = Math.min(Math.max(1, currentPage), totalPages);
    
    return {
        page: page,
        pages: totalPages,
        total: totalItems,
        has_prev: page > 1,
        has_next: page < totalPages,
        prev_num: page - 1,
        next_num: page + 1
    };
}