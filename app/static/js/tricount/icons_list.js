// app/static/js/tricount/icons_list.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
    
    // === GESTION DU SÉLECTEUR D'EMOJI ===
    const emojiButtons = document.querySelectorAll('.emoji-btn');
    const unicodeEmojiInput = document.getElementById('unicode_emoji');
    const previewEmoji = document.getElementById('preview-emoji');
    
    // Fonction pour sélectionner un emoji
    function selectEmoji(emoji) {
        unicodeEmojiInput.value = emoji;
        unicodeEmojiInput.dispatchEvent(new Event('input')); // Déclencher l'événement input
        
        // Scroll jusqu'au formulaire d'ajout pour une meilleure UX
        document.getElementById('add-icon-form').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
        });
        
        // Mettre le focus sur le champ suivant (généralement le nom)
        document.getElementById('name').focus();
    }
    
    // Attacher l'événement de clic à tous les boutons d'emoji
    emojiButtons.forEach(button => {
        button.addEventListener('click', function() {
            const emoji = this.getAttribute('data-emoji');
            selectEmoji(emoji);
            
            // Mettre en évidence le bouton sélectionné
            emojiButtons.forEach(btn => btn.classList.remove('active', 'btn-primary'));
            this.classList.add('active', 'btn-primary');
        });
    });
    
    // === GESTION DE LA RECHERCHE D'EMOJI ===
    const searchEmojiInput = document.getElementById('search-emoji');
    if (searchEmojiInput) {
        searchEmojiInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            
            if (searchTerm.length < 2) {
                // Réinitialiser l'affichage si la recherche est trop courte
                document.querySelectorAll('.emoji-category').forEach(cat => {
                    cat.style.display = 'block';
                });
                emojiButtons.forEach(button => {
                    button.style.display = 'flex';
                });
                return;
            }
            
            // Masquer les catégories sans résultats
            document.querySelectorAll('.emoji-category').forEach(cat => {
                const categoryTitle = cat.querySelector('.emoji-category-title').textContent.toLowerCase();
                const buttons = cat.querySelectorAll('.emoji-btn');
                
                let hasVisibleButtons = false;
                
                buttons.forEach(button => {
                    // Vérifier si l'emoji ou la catégorie correspond à la recherche
                    const matches = categoryTitle.includes(searchTerm);
                    button.style.display = matches ? 'flex' : 'none';
                    
                    if (matches) hasVisibleButtons = true;
                });
                
                cat.style.display = hasVisibleButtons ? 'block' : 'none';
            });
        });
    }
    
    // === GESTION DES APERÇUS D'ICÔNE ===
    // Live preview pour le formulaire d'ajout
    const fontAwesomeInput = document.getElementById('font_awesome_class');
    unicodeEmojiInput.addEventListener('input', function() {
        if (previewEmoji) {
            previewEmoji.textContent = this.value || '?';
        }
    });
    
    if (fontAwesomeInput) {
        const previewFaIcon = document.getElementById('preview-fa-icon');
        fontAwesomeInput.addEventListener('input', function() {
            if (previewFaIcon) {
                previewFaIcon.className = 'fas ' + this.value + ' fa-2x';
            }
        });
    }
    
    // === GESTION DES MODALES ===
    // Modal d'édition
    const editButtons = document.querySelectorAll('.edit-icon');
    const editModal = new bootstrap.Modal(document.getElementById('editIconModal'));
    const editIconForm = document.getElementById('edit-icon-form');
    const editNameInput = document.getElementById('edit-name');
    const editDescriptionInput = document.getElementById('edit-description');
    const editFontAwesomeInput = document.getElementById('edit-font-awesome-class');
    const editUnicodeEmojiInput = document.getElementById('edit-unicode-emoji');
    const editPreviewFaIcon = document.getElementById('edit-preview-fa-icon');
    const editPreviewEmoji = document.getElementById('edit-preview-emoji');
    const saveIconButton = document.getElementById('save-icon');
    
    // Aperçu live pour le formulaire d'édition
    if (editFontAwesomeInput && editPreviewFaIcon) {
        editFontAwesomeInput.addEventListener('input', function() {
            editPreviewFaIcon.className = 'fas ' + this.value + ' fa-2x';
        });
    }
    
    if (editUnicodeEmojiInput && editPreviewEmoji) {
        editUnicodeEmojiInput.addEventListener('input', function() {
            editPreviewEmoji.textContent = this.value || '?';
        });
    }
    
    // Gestion des boutons d'édition
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const iconId = this.dataset.id;
            const iconName = this.dataset.name;
            const iconDescription = this.dataset.description;
            const iconFontAwesomeClass = this.dataset.fontAwesomeClass;
            const iconUnicodeEmoji = this.dataset.unicodeEmoji;
            
            // Remplir le formulaire
            editNameInput.value = iconName;
            editDescriptionInput.value = iconDescription;
            editFontAwesomeInput.value = iconFontAwesomeClass;
            editUnicodeEmojiInput.value = iconUnicodeEmoji;
            
            // Mettre à jour l'aperçu
            if (editPreviewFaIcon) {
                editPreviewFaIcon.className = 'fas ' + (iconFontAwesomeClass || 'fa-question') + ' fa-2x';
            }
            if (editPreviewEmoji) {
                editPreviewEmoji.textContent = iconUnicodeEmoji || '?';
            }
            
            // Définir l'URL de soumission
            editIconForm.action = `/tricount/icons/update/${iconId}`;
            
            // Afficher la modal
            editModal.show();
        });
    });
    
    // Bouton de sauvegarde
    if (saveIconButton) {
        saveIconButton.addEventListener('click', function() {
            editIconForm.submit();
        });
    }
    
    // Modal de suppression
    const deleteButtons = document.querySelectorAll('.delete-icon');
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteIconModal'));
    const deleteIconName = document.getElementById('delete-icon-name');
    const deleteIconForm = document.getElementById('delete-icon-form');
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const iconId = this.dataset.id;
            const iconName = this.dataset.name;
            
            deleteIconName.textContent = iconName;
            deleteIconForm.action = `/tricount/icons/delete/${iconId}`;
            
            deleteModal.show();
        });
    });
});