// app/static/js/tricount/auto_categorize/frequency.js

/**
 * Module de gestion de la fréquence pour l'auto-catégorisation
 * Gère l'affichage et la configuration des options de fréquence
 */

// Assurer que l'objet global existe
window.AutoCategorize = window.AutoCategorize || {};

/**
 * Initialise la gestion de la fréquence
 */
AutoCategorize.initFrequency = function() {
    const frequencyType = document.getElementById('frequency-type');
    
    if (frequencyType) {
        frequencyType.addEventListener('change', function() {
            AutoCategorize.updateFrequencyDayVisibility();
            AutoCategorize.markFormChanged();
        });
        
        // Détection de fréquence automatique au chargement
        if (typeof AutoCategorize.detectFrequency === 'function') {
            const expenseId = document.getElementById('rule-form').querySelector('input[name="expense_id"]').value;
            if (expenseId) {
                AutoCategorize.detectFrequency(expenseId);
            }
        }
    }
    
    // Appliquer la visibilité initiale
    AutoCategorize.updateFrequencyDayVisibility();
};

/**
 * Met à jour la visibilité du champ de jour en fonction du type de fréquence
 */
AutoCategorize.updateFrequencyDayVisibility = function() {
    const frequencyType = document.getElementById('frequency-type');
    const frequencyDayContainer = document.getElementById('frequency-day-container');
    const frequencyDayHelp = document.getElementById('frequency-day-help');
    const frequencyDay = document.getElementById('frequency-day');
    
    if (!frequencyType || !frequencyDayContainer) return;
    
    if (frequencyType.value === 'none') {
        frequencyDayContainer.style.display = 'none';
    } else {
        frequencyDayContainer.style.display = 'block';
        
        if (frequencyType.value === 'monthly') {
            frequencyDayHelp.textContent = 'Jour du mois (1-31) pour la fréquence mensuelle.';
            frequencyDay.max = 31;
            frequencyDay.min = 1;
            
            // Vérifier que la valeur est dans les limites
            if (frequencyDay.value > 31) frequencyDay.value = 31;
            if (frequencyDay.value < 1) frequencyDay.value = 1;
        } else if (frequencyType.value === 'weekly') {
            frequencyDayHelp.textContent = 'Jour de la semaine (0=Lundi, 6=Dimanche) pour la fréquence hebdomadaire.';
            frequencyDay.max = 6;
            frequencyDay.min = 0;
            
            // Vérifier que la valeur est dans les limites
            if (frequencyDay.value > 6) frequencyDay.value = 6;
            if (frequencyDay.value < 0) frequencyDay.value = 0;
            
            // Ajouter des indications sur les jours
            const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
            frequencyDayHelp.innerHTML = `
                Jour de la semaine: <br>
                ${days.map((day, index) => `${index} = ${day}`).join('<br>')}
            `;
        }
    }
};

/**
 * Détecte automatiquement la fréquence à partir d'une dépense donnée
 * @param {number} expenseId - ID de la dépense source
 */
AutoCategorize.detectFrequency = function(expenseId) {
    const merchantContains = document.getElementById('merchant-contains');
    
    if (!merchantContains || !merchantContains.value) return;
    
    fetch('/tricount/detect-frequency', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            expense_id: expenseId,
            merchant_contains: merchantContains.value
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.frequency) {
            const frequencyType = document.getElementById('frequency-type');
            const frequencyDay = document.getElementById('frequency-day');
            
            if (frequencyType && frequencyDay && data.frequency.type) {
                frequencyType.value = data.frequency.type;
                frequencyDay.value = data.frequency.day;
                
                // Mettre à jour l'affichage
                AutoCategorize.updateFrequencyDayVisibility();
                
                // Afficher un message informatif si la confiance est élevée
                if (data.frequency.confidence > 0.7) {
                    const frequencyInfo = document.createElement('div');
                    frequencyInfo.className = 'alert alert-info mt-2';
                    frequencyInfo.innerHTML = `
                        <i class="fas fa-info-circle me-2"></i>
                        Fréquence détectée automatiquement avec ${Math.round(data.frequency.confidence * 100)}% de confiance.
                    `;
                    frequencyDay.parentNode.appendChild(frequencyInfo);
                    
                    // Supprimer le message après 5 secondes
                    setTimeout(() => {
                        frequencyInfo.remove();
                    }, 5000);
                }
            }
        }
    })
    .catch(error => {
        console.error('Error detecting frequency:', error);
    });
};