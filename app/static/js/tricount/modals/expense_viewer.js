// app/static/js/tricount/modals/expense_viewer.js
/**
 * Module de visualisation des dépenses
 * Gère l'affichage détaillé d'une dépense dans un modal
 * Version améliorée avec support d'historique
 */

class ExpenseViewer {
    /**
     * Crée une instance du visualiseur de dépenses
     * @param {Object} options - Options de configuration
     */
    constructor(options = {}) {
        // Configuration par défaut
        this.config = {
            modalId: 'viewExpenseModal',
            endpointUrl: '/tricount/reimbursements/expense',
            historyEnabled: true,
            historyEndpointUrl: '/tricount/reimbursements/expense-history',
            ...options
        };
        
        // Éléments DOM
        this.modal = document.getElementById(this.config.modalId);
        
        // Vérifier si le modal existe
        if (!this.modal) {
            console.error(`Modal non trouvé: ${this.config.modalId}`);
            return;
        }
        
        // Initialiser le modal Bootstrap
        this.bsModal = new bootstrap.Modal(this.modal);
        
        // Initialiser les événements
        this._setupEventListeners();
        
        console.log(`ExpenseViewer initialisé (modal: ${this.config.modalId})`);
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
        
        // Écouter les changements d'onglets pour charger l'historique à la demande
        if (this.config.historyEnabled) {
            const historyTab = this.modal.querySelector('#history-tab');
            if (historyTab) {
                historyTab.addEventListener('shown.bs.tab', (e) => {
                    const expenseId = this.modal.querySelector('#view-expense-id').value;
                    if (expenseId) {
                        this._loadExpenseHistory(expenseId);
                    }
                });
            }
        }
    }
    
    /**
     * Initialise les tooltips Bootstrap dans le modal
     * @private
     */
    _initTooltips() {
        const tooltipTriggerList = [].slice.call(this.modal.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(el => {
            // Supprimer les tooltips existants
            if (el._tooltip) {
                el._tooltip.dispose();
            }
            // Créer un nouveau tooltip
            el._tooltip = new bootstrap.Tooltip(el);
        });
    }
    
    /**
     * Charge et affiche les détails d'une dépense
     * @param {string|number} expenseId - ID de la dépense à afficher
     */
    showExpense(expenseId) {
        console.log(`Chargement des détails de la dépense: ${expenseId}`);
        
        // Charger les données
        fetch(`${this.config.endpointUrl}/${expenseId}`, {
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
                
                // Activer l'onglet de détails par défaut
                const detailsTab = this.modal.querySelector('#details-tab');
                if (detailsTab) {
                    const tabInstance = new bootstrap.Tab(detailsTab);
                    tabInstance.show();
                }
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
     * Charge l'historique d'une dépense
     * @param {string|number} expenseId - ID de la dépense
     * @private
     */
    _loadExpenseHistory(expenseId) {
        // Afficher un indicateur de chargement
        const timelineContainer = this.modal.querySelector('#expense-timeline');
        if (!timelineContainer) return;
        
        timelineContainer.innerHTML = `
            <div class="text-center p-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-2">Chargement de l'historique...</p>
            </div>
        `;
        
        // Construire l'historique à partir des informations disponibles
        const expense = this.currentExpenseData;
        if (!expense) {
            timelineContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Données insuffisantes pour générer l'historique.
                </div>
            `;
            return;
        }
        
        // Générer l'historique
        const timelineHtml = this._generateTimelineHtml(expense);
        timelineContainer.innerHTML = timelineHtml;
    }
    
    /**
     * Génère le HTML de la timeline basée sur les données de la dépense
     * @param {Object} expense - Données de la dépense
     * @returns {string} - HTML formaté de la timeline
     * @private
     */
    _generateTimelineHtml(expense) {
        let timelineHtml = '';
        
        // Ajouter l'événement de création
        if (expense.created_at) {
            timelineHtml += this._createTimelineItem({
                date: expense.created_at,
                title: 'Création de la dépense',
                content: `Dépense créée à partir de ${expense.source || 'source inconnue'}`,
                type: 'creation'
            });
        }
        
        // Ajouter les événements de modification
        // Modification du marchand
        if (expense.merchant_modified_by && expense.merchant_modified_by !== 'import') {
            timelineHtml += this._createTimelineItem({
                date: expense.updated_at,
                title: 'Modification du nom de marchand',
                content: this._formatModificationContent(
                    'Nom du marchand', 
                    expense.merchant, 
                    expense.renamed_merchant,
                    expense.merchant_modified_by
                ),
                type: this._getModificationType(expense.merchant_modified_by)
            });
        }
        
        // Modification de la description
        if (expense.notes_modified_by && expense.notes_modified_by !== 'import') {
            timelineHtml += this._createTimelineItem({
                date: expense.updated_at,
                title: 'Ajout de notes personnelles',
                content: this._formatModificationContent(
                    'Description', 
                    expense.description, 
                    expense.notes,
                    expense.notes_modified_by
                ),
                type: this._getModificationType(expense.notes_modified_by)
            });
        }
        
        // Modification de la catégorie
        if (expense.category_modified_by && expense.category_modified_by !== 'import') {
            timelineHtml += this._createTimelineItem({
                date: expense.updated_at,
                title: 'Modification de la catégorie',
                content: `
                    <div class="change-details">
                        <div class="change-label">Catégorie</div>
                        <div class="change-value">
                            ${expense.category ? expense.category.name : 'Non catégorisé'}
                            ${this._formatModificationSource(expense.category_modified_by)}
                        </div>
                    </div>
                `,
                type: this._getModificationType(expense.category_modified_by)
            });
        }
        
        // Modification du flag
        if (expense.flag_modified_by && expense.flag_modified_by !== 'import') {
            timelineHtml += this._createTimelineItem({
                date: expense.updated_at,
                title: 'Modification du type de dépense',
                content: `
                    <div class="change-details">
                        <div class="change-label">Type</div>
                        <div class="change-value">
                            ${expense.flag ? expense.flag.name : 'Non défini'}
                            ${this._formatModificationSource(expense.flag_modified_by)}
                        </div>
                    </div>
                `,
                type: this._getModificationType(expense.flag_modified_by)
            });
        }
        
        // Événements de remboursement
        if (expense.declaration_date) {
            timelineHtml += this._createTimelineItem({
                date: expense.declaration_date,
                title: 'Déclaration pour remboursement',
                content: `
                    <div class="mb-2">Dépense déclarée pour remboursement.</div>
                    ${expense.declaration_reference ? `<div class="small">Référence: ${expense.declaration_reference}</div>` : ''}
                `,
                type: 'declaration'
            });
        }
        
        if (expense.reimbursement_date) {
            timelineHtml += this._createTimelineItem({
                date: expense.reimbursement_date,
                title: 'Remboursement effectué',
                content: `
                    <div class="mb-2">Dépense remboursée.</div>
                    <div class="badge bg-success">
                        <i class="fas fa-check-circle me-1"></i>Terminé
                    </div>
                `,
                type: 'reimbursement'
            });
        }
        
        // Aucun événement
        if (timelineHtml === '') {
            timelineHtml = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Aucun événement à afficher dans l'historique.
                </div>
            `;
        }
        
        return timelineHtml;
    }
    
    /**
     * Crée un élément HTML pour la timeline
     * @param {Object} item - Données de l'élément
     * @param {string} item.date - Date au format string
     * @param {string} item.title - Titre de l'élément
     * @param {string} item.content - Contenu HTML de l'élément
     * @param {string} item.type - Type d'élément (manual, auto, creation, etc.)
     * @returns {string} - HTML formaté
     * @private
     */
    _createTimelineItem({ date, title, content, type }) {
        return `
            <div class="timeline-item ${type}">
                <div class="timeline-content">
                    <span class="timeline-date">
                        <i class="fas fa-clock me-1"></i>${this._formatDate(date)}
                    </span>
                    <h5 class="timeline-title">${title}</h5>
                    <div class="timeline-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Formate une date pour l'affichage
     * @param {string} dateStr - Date au format string
     * @returns {string} - Date formatée
     * @private
     */
    _formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('fr-FR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr || 'Date inconnue';
        }
    }
    
    /**
     * Détermine le type de modification
     * @param {string} source - Source de la modification
     * @returns {string} - Type de modification
     * @private
     */
    _getModificationType(source) {
        switch (source) {
            case 'manual':
                return 'manual';
            case 'auto_rule':
                return 'auto';
            case 'auto_rule_confirmed':
                return 'auto-confirmed';
            default:
                return '';
        }
    }
    
    /**
     * Formate le contenu d'une modification
     * @param {string} label - Libellé du champ modifié
     * @param {string} oldValue - Ancienne valeur
     * @param {string} newValue - Nouvelle valeur
     * @param {string} source - Source de la modification
     * @returns {string} - HTML formaté
     * @private
     */
    _formatModificationContent(label, oldValue, newValue, source) {
        return `
            <div class="change-details">
                <div class="change-label">${label}</div>
                <div class="change-arrow">
                    <i class="fas fa-long-arrow-alt-right"></i>
                </div>
                <div class="change-value">
                    <div class="mb-1">${newValue || 'Non défini'}</div>
                    <div class="small text-muted">
                        ${oldValue ? `Valeur précédente: ${oldValue}` : ''}
                        ${this._formatModificationSource(source)}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Formate la source de modification
     * @param {string} source - Source de modification
     * @returns {string} - HTML formaté
     * @private
     */
    _formatModificationSource(source) {
        if (!source || source === 'import') return '';
        
        const sources = {
            'manual': {
                icon: 'fas fa-user',
                text: 'Modifié manuellement',
                className: 'bg-primary'
            },
            'auto_rule': {
                icon: 'fas fa-magic',
                text: 'Appliqué par règle automatique',
                className: 'bg-info'
            },
            'auto_rule_confirmed': {
                icon: 'fas fa-check-circle',
                text: 'Appliqué par règle confirmée',
                className: 'bg-success'
            }
        };
        
        const sourceInfo = sources[source] || {
            icon: 'fas fa-question-circle',
            text: `Source: ${source}`,
            className: 'bg-secondary'
        };
        
        return `
            <span class="badge ${sourceInfo.className} ms-1" data-bs-toggle="tooltip" title="${sourceInfo.text}">
                <i class="${sourceInfo.icon}"></i>
            </span>
        `;
    }
    
    /**
     * Remplit le modal avec les données de la dépense
     * @param {Object} expense - Données de la dépense
     * @private
     */
    _populateModal(expense) {
        // Stocker les données pour utilisation ultérieure
        this.currentExpenseData = expense;
        
        // Stocker l'ID de la dépense dans le champ caché
        const idField = this.modal.querySelector('#view-expense-id');
        if (idField) idField.value = expense.id;
        
        // Informations principales
        this._setElementContent('#view-merchant', this._formatMerchant(expense));
        this._setElementContent('#view-merchant-source', this._formatModificationInfo(expense.merchant_modified_by));
        
        this._setElementContent('#view-description', this._formatDescription(expense));
        this._setElementContent('#view-description-source', this._formatModificationInfo(expense.notes_modified_by));
        
        // Montant et date
        this._setElementContent('#view-amount', this._formatAmount(expense));
        this._setElementContent('#view-date', expense.date);
        
        // Catégorie et flag
        this._setElementContent('#view-category', this._formatCategory(expense));
        this._setElementContent('#view-category-source', this._formatModificationInfo(expense.category_modified_by));
        
        this._setElementContent('#view-flag', this._formatFlag(expense));
        this._setElementContent('#view-flag-source', this._formatModificationInfo(expense.flag_modified_by));
        
        // Dupliquer le statut de remboursement pour les deux onglets
        const reimbStatus = this._formatReimbursableStatus(expense);
        this._setElementContent('#view-reimbursable-status', reimbStatus);
        this._setElementContent('#view-reimbursable-status-tab', reimbStatus);
        
        // Statut, références et dates
        this._setElementContent('#view-status', this._formatStatus(expense));
        this._setElementContent('#view-reference', expense.declaration_reference || 'Aucune référence');
        this._setElementContent('#view-notes', expense.notes || 'Aucune note');
        this._setElementContent('#view-declaration-notes', expense.declaration_notes || 'Aucune note spécifique');
        this._setElementContent('#view-declaration-date', expense.declaration_date || 'Non déclarée');
        this._setElementContent('#view-reimbursement-date', expense.reimbursement_date || 'Non remboursée');
        
        // Source et texte original
        this._setElementContent('#view-source', expense.source || 'Source inconnue');
        const originalTextContent = expense.original_text || 'Aucun texte original disponible';
        this._setElementContent('#view-original-text', originalTextContent);
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
        if (expense.renamed_merchant) {
            return `
                ${expense.renamed_merchant}
                <small class="text-muted d-block">
                    <i class="fas fa-tag me-1"></i>Nom original: ${expense.merchant}
                </small>
            `;
        }
        return expense.merchant;
    }
    
    /**
     * Formate les informations de modification
     * @param {string} source - Source de modification
     * @returns {string} - Texte formaté
     * @private
     */
    _formatModificationInfo(source) {
        if (!source || source === 'import') return '';
        
        const sources = {
            'manual': 'Modifié manuellement',
            'auto_rule': 'Modifié par règle automatique',
            'auto_rule_confirmed': 'Modifié par règle confirmée'
        };
        
        return sources[source] || `Source: ${source}`;
    }
    
    /**
     * Formate la description pour l'affichage
     * @param {Object} expense - Données de la dépense
     * @returns {string} - HTML formaté
     * @private
     */
    _formatDescription(expense) {
        if (expense.notes) {
            return `
                ${expense.notes}
                ${expense.description ? `
                <small class="text-muted d-block mt-2">
                    <i class="fas fa-align-left me-1"></i>Description originale: ${expense.description}
                </small>` : ''}
            `;
        }
        return expense.description || 'Aucune description';
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
        
        return `<span class="${className}">${expense.is_debit ? '-' : ''}${amount} €</span>`;
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
                `<span class="flag-badge" style="background-color: ${expense.flag.color}">${expense.flag.name}</span>`;
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
        if (expense.flag && expense.flag.reimbursement_type) {
            if (expense.flag.reimbursement_type === 'not_reimbursable') {
                return '<span class="badge bg-secondary"><i class="fas fa-ban me-1"></i>Non remboursable</span>';
            } else if (expense.flag.reimbursement_type === 'partially_reimbursable') {
                return '<span class="badge bg-info"><i class="fas fa-percent me-1"></i>Partiellement remboursable</span>';
            } else if (expense.flag.reimbursement_type === 'fully_reimbursable') {
                return '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Entièrement remboursable</span>';
            }
        }
        return '<span class="badge bg-secondary">Type non défini</span>';
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

// Exporter la classe pour une utilisation avec import
export default ExpenseViewer;