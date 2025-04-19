// app/static/js/tricount/modals/expense_viewer.js
/**
 * Module de visualisation des dépenses
 * Gère l'affichage détaillé d'une dépense dans un modal
 */

class ExpenseViewer {
    /**
     * Crée une instance du visualiseur de dépenses
     * @param {string} modalId - ID du modal HTML (défaut: 'viewExpenseModal')
     * @param {string} endpointUrl - URL de l'API pour récupérer les détails de la dépense
     */
    constructor(modalId = 'viewExpenseModal', endpointUrl = '/tricount/reimbursements/expense') {
        // Éléments DOM
        this.modal = document.getElementById(modalId);
        this.endpointUrl = endpointUrl;
        
        // Vérifier si le modal existe
        if (!this.modal) {
            console.error(`Modal non trouvé: ${modalId}`);
            return;
        }
        
        // Initialiser le modal Bootstrap
        this.bsModal = new bootstrap.Modal(this.modal);
        
        // Initialiser les événements
        this._setupEventListeners();
        
        console.log(`ExpenseViewer initialisé (modal: ${modalId})`);
    }
    
    /**
     * Configure les écouteurs d'événements
     * @private
     */
    _setupEventListeners() {
        // Écouter les événements de clic sur les boutons de visualisation
        const viewButtons = document.querySelectorAll('.view-expense-btn');
        
        viewButtons.forEach(button => {
            // Supprimer les anciens écouteurs
            const newButton = button.cloneNode(true);
            
            // Ajouter le nouvel écouteur
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                const expenseId = newButton.dataset.expenseId;
                if (expenseId) {
                    this.showExpense(expenseId);
                }
            });
            
            // Remplacer le bouton original
            if (button.parentNode) {
                button.parentNode.replaceChild(newButton, button);
            }
        });
    }
    
    /**
     * Initialise les tooltips Bootstrap dans le modal
     * @private
     */
    _initTooltips() {
        const tooltipTriggerList = [].slice.call(this.modal.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));
    }
    
    /**
     * Charge et affiche les détails d'une dépense
     * @param {string|number} expenseId - ID de la dépense à afficher
     */
    showExpense(expenseId) {
        console.log(`Chargement des détails de la dépense: ${expenseId}`);
        
        // Charger les données
        fetch(`${this.endpointUrl}/${expenseId}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Remplir le modal avec les données
                this._populateModal(data.expense);
                
                // Afficher le modal
                this.bsModal.show();
                
                // Initialiser les tooltips après ouverture
                setTimeout(() => this._initTooltips(), 300);
            } else {
                throw new Error(data.error || 'Erreur lors du chargement des données');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert(`Erreur lors du chargement des détails: ${error.message}`);
        });
    }
    
    /**
     * Remplit le modal avec les données de la dépense
     * @param {Object} expense - Données de la dépense
     * @private
     */
    _populateModal(expense) {
        // Stocker l'ID de la dépense dans le champ caché
        const idField = this.modal.querySelector('#view-expense-id');
        if (idField) idField.value = expense.id;
        
        // Informations principales
        this._setElementContent('#view-merchant', this._formatMerchant(expense));
        this._setElementContent('#view-description', this._formatDescription(expense));
        
        // Montant et date
        this._setElementContent('#view-amount', this._formatAmount(expense));
        this._setElementContent('#view-date', expense.date);
        
        // Catégorie et flag
        this._setElementContent('#view-category', this._formatCategory(expense));
        this._setElementContent('#view-flag', this._formatFlag(expense));
        this._setElementContent('#view-reimbursable-status', this._formatReimbursableStatus(expense));
        
        // Statut, références et dates
        this._setElementContent('#view-status', this._formatStatus(expense));
        this._setElementContent('#view-reference', expense.declaration_reference || 'Aucune référence');
        this._setElementContent('#view-notes', expense.notes || 'Aucune note');
        this._setElementContent('#view-declaration-date', expense.declaration_date || 'Non déclarée');
        this._setElementContent('#view-reimbursement-date', expense.reimbursement_date || 'Non remboursée');
        
        // Texte original
        const originalTextContainer = this.modal.querySelector('#original-text-container');
        if (originalTextContainer) {
            if (expense.original_text) {
                this._setElementContent('#view-original-text', expense.original_text);
                originalTextContainer.style.display = 'block';
            } else {
                originalTextContainer.style.display = 'none';
            }
        }
    }
    
    /**
     * Définit le contenu d'un élément
     * @param {string} selector - Sélecteur CSS
     * @param {string|HTMLElement} content - Contenu à définir
     * @private
     */
    _setElementContent(selector, content) {
        const element = this.modal.querySelector(selector);
        if (!element) return;
        
        if (content instanceof HTMLElement) {
            // Vider d'abord l'élément
            element.innerHTML = '';
            element.appendChild(content);
        } else if (typeof content === 'string') {
            // Le contenu peut être du HTML (comme pour les badges)
            if (content.trim().startsWith('<')) {
                element.innerHTML = content;
            } else {
                element.textContent = content;
            }
        }
    }
    
    /**
     * Formate le marchand pour l'affichage
     * @param {Object} expense - Données de la dépense
     * @returns {string} - HTML formaté
     * @private
     */
    _formatMerchant(expense) {
        let html = expense.renamed_merchant || expense.merchant;
        
        // Ajouter une indication si le nom a été renommé
        if (expense.renamed_merchant) {
            html += `
                <small class="text-muted d-block">
                    <i class="fas fa-tag me-1"></i>Nom original: ${expense.merchant}
                </small>
            `;
        }
        
        return html;
    }
    
    /**
     * Formate la description pour l'affichage
     * @param {Object} expense - Données de la dépense
     * @returns {string} - HTML formaté
     * @private
     */
    _formatDescription(expense) {
        let html = expense.notes || expense.description || 'Aucune description';
        
        // Ajouter une indication si des notes ont été ajoutées
        if (expense.notes && expense.description) {
            html += `
                <small class="text-muted d-block mt-2">
                    <i class="fas fa-align-left me-1"></i>Description originale: ${expense.description}
                </small>
            `;
        }
        
        return html;
    }
    
    /**
     * Formate le montant pour l'affichage
     * @param {Object} expense - Données de la dépense
     * @returns {string} - Montant formaté
     * @private
     */
    _formatAmount(expense) {
        const amount = parseFloat(expense.amount).toFixed(2);
        const className = expense.is_debit ? 'text-danger mb-0' : 'text-success mb-0';
        
        const span = document.createElement('span');
        span.className = className;
        span.textContent = `${amount} €`;
        
        return span;
    }
    
    /**
     * Formate la catégorie pour l'affichage
     * @param {Object} expense - Données de la dépense
     * @returns {string} - HTML formaté
     * @private
     */
    _formatCategory(expense) {
        if (expense.category) {
            return `
                <span class="category-badge" style="border-color: ${expense.category.color}">
                    ${expense.category.name}
                </span>
            `;
        } else {
            return '<span class="badge bg-secondary">Non catégorisé</span>';
        }
    }
    
    /**
     * Formate le flag pour l'affichage
     * @param {Object} expense - Données de la dépense
     * @returns {string} - HTML formaté
     * @private
     */
    _formatFlag(expense) {
        if (expense.flag) {
            return expense.flag_html || 
                `<span class="badge" style="background-color: ${expense.flag.color}">${expense.flag.name}</span>`;
        } else {
            return '<span class="badge bg-secondary">Non défini</span>';
        }
    }
    
    /**
     * Formate le statut de remboursement pour l'affichage
     * @param {Object} expense - Données de la dépense
     * @returns {string} - HTML formaté
     * @private
     */
    _formatReimbursableStatus(expense) {
        if (expense.flag) {
            if (expense.flag.reimbursement_type === 'not_reimbursable') {
                return '<span class="badge bg-secondary"><i class="fas fa-ban me-1"></i>Non remboursable</span>';
            } else if (expense.flag.reimbursement_type === 'partially_reimbursable') {
                return '<span class="badge bg-info"><i class="fas fa-percent me-1"></i>Partiellement remboursable</span>';
            } else if (expense.flag.reimbursement_type === 'fully_reimbursable') {
                return '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Entièrement remboursable</span>';
            }
        }
        return '';
    }
    
    /**
     * Formate le statut pour l'affichage
     * @param {Object} expense - Données de la dépense
     * @returns {string} - HTML formaté
     * @private
     */
    _formatStatus(expense) {
        if (expense.is_reimbursed) {
            return '<span class="badge bg-success">Remboursée</span>';
        } else if (expense.is_declared) {
            return '<span class="badge bg-primary">Déclarée</span>';
        } else {
            return '<span class="badge bg-secondary">Non déclarée</span>';
        }
    }
}

// Créer une instance globale lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    // Ne pas écraser une instance existante
    if (window.ExpenseViewer === undefined) {
        window.ExpenseViewer = new ExpenseViewer();
    }
});

// Exporter la classe pour une utilisation avec import
export default ExpenseViewer;