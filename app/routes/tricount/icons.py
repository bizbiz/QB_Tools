# app/routes/tricount/icons.py
from flask import render_template, redirect, url_for, flash, request, jsonify
from app.routes.tricount import tricount_bp
from app.extensions import db
from app.models.tricount import Icon
from sqlalchemy.exc import IntegrityError
import random

# Liste d'émojis variés par catégories (environ 1000 émojis)
EMOJI_CATEGORIES = {
    "Objets": [
        "📱", "💻", "⌚", "⌨️", "🖥️", "🖨️", "💿", "💾", "📀", "🎥", "🎬", "📺", "📷", "📹", "🔍", 
        "🔎", "🔬", "🔭", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🧯", "🛢️", "💸", "💵", "💴", "💶", 
        "💷", "💰", "💳", "💎", "⚖️", "🧰", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🔩", "⚙️", "🧱", "⛓️", 
        "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡️", "⚔️", "🛡️", "🚬", "⚰️", "⚱️", "🏺", "🔮", "📿", 
        "🧿", "💈", "⚗️", "🔭", "🔬", "🕳️", "💊", "💉", "🩸", "🩹", "🩺", "🔖", "🧷", "📍", "📌", 
        "📎", "🖇️", "📏", "📐", "✂️", "🧮", "🗃️", "🗄️", "🗑️", "🔒", "🔓", "🔏", "🔐", "🔑", "🗝️", 
        "🔨", "🪓", "⛏️", "⚒️", "🛠️", "🗡️", "⚔️", "🔫", "🏹", "🛡️", "🪚", "🔧", "🪛", "🔩", "⚙️", 
        "🗜️", "⚖️", "🦯", "🔗", "⛓️", "🧰", "🧲", "🧪", "🧫", "🧬", "🔬", "🔭", "📡", "💉", "🩸", 
        "🩹", "🩺", "🩻", "🩼", "🪮", "🪢", "🧶", "🧵", "🪡", "🧷", "📌", "📍", "🧮", "🖇️", "📎"
    ],
    "Nourriture": [
        "🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭", "🍎", "🍏", "🍐", "🍑", "🍒", "🍓", "🫐", 
        "🥝", "🍅", "🫒", "🥥", "🥑", "🍆", "🥔", "🥕", "🌽", "🌶️", "🫑", "🥒", "🥬", "🥦", "🧄", 
        "🧅", "🍄", "🥜", "🫘", "🌰", "🍞", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🧀", "🍖", 
        "🍗", "🥩", "🥓", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆", "🥚", "🍳", 
        "🥘", "🍲", "🫕", "🥣", "🥗", "🍿", "🧈", "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", 
        "🍝", "🍠", "🍢", "🍣", "🍤", "🍥", "🥮", "🍡", "🥟", "🥠", "🥡", "🦪", "🍦", "🍧", "🍨", 
        "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯", "🍼", "🥛", "☕", "🫖", 
        "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🫗", "🥤", "🧋", "🧃", "🧉", 
        "🧊", "🥢", "🍽️", "🍴", "🥄", "🔪", "🫙", "🏺"
    ],
    "Transport": [
        "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🛵", 
        "🏍️", "🛺", "🚲", "🛴", "🛹", "🛼", "🚏", "🚦", "🚥", "🚧", "🛑", "⚓", "🚢", "⛴️", "🛥️", 
        "🚤", "🛳️", "⛵", "🚣", "🚁", "🛩️", "✈️", "🚀", "🛸", "🚇", "🚊", "🚉", "🚈", "🚂", "🚆", 
        "🚅", "🚄", "🚝", "🚞", "🚃", "🚟", "🚠", "🚡", "🚖", "🚘", "🚔", "🚍", "🚘", "🚖", "🚋", 
        "🚅", "🚆", "🚇", "🚈", "🚉", "🚊", "🚝", "🚞", "🚋", "🚌", "🚍", "🚎", "🚐", "🚑", "🚒"
    ],
    "Lieux": [
        "🏙️", "🌃", "🌉", "🏞️", "🏜️", "🏝️", "🏕️", "🏖️", "🏗️", "🏘️", "🏚️", "🏛️", "🏟️", "🏠", 
        "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", "🏫", "🏬", "🏭", "🏯", "🏰", "💒", 
        "🗼", "🗽", "⛪", "🕌", "🕍", "⛩️", "🕋", "⛲", "⛺", "🏙️", "🌄", "🌅", "🌆", "🌇", "🌈", 
        "🎢", "🎡", "🎪", "🎭", "🖼️", "🎨", "🎰", "🚂", "🚃", "🚄", "🚅", "🚆", "🚇", "🚈", "🚉", 
        "🚊", "🚝", "🚞", "🚋", "🚌", "🚍", "🚎", "🚐", "🌁", "🌃", "🏙️", "🌄", "🌅", "🌆", "🌇", 
        "🌉", "🌌", "🏔️", "⛰️", "🗻", "🏕️", "🏖️", "🏜️", "🏝️", "🏞️", "🏟️", "🏛️", "🏗️", "🧱", 
        "🏘️", "🏚️", "🏠", "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", "🏫", "🏬", "🏭", 
        "🏯", "🏰", "💒", "🗼", "🗽", "⛪", "🕌", "🕍", "⛩️", "🕋", "⛲", "⛺", "🌁", "🏭", "⚓", "🏟️"
    ],
    "Symboles": [
        "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "⛎", "🔀", "🔁", "🔂", "⏩", 
        "⏭️", "⏯️", "◀️", "⏪", "⏮️", "🔼", "⏫", "🔽", "⏬", "⏸️", "⏹️", "⏺️", "⏏️", "🎦", "🔅", 
        "🔆", "📶", "📳", "📴", "♾️", "♻️", "⚜️", "🔱", "📛", "🔰", "⭕", "✅", "☑️", "✔️", "❌", 
        "❎", "➰", "➿", "〽️", "✳️", "✴️", "❇️", "©️", "®️", "™️", "🔟", "🔢", "🔣", "🔤", "🅰️", 
        "🆎", "🅱️", "🆑", "🆒", "🆓", "🆔", "🆕", "🆖", "🆗", "🆘", "🆙", "🆚", "🈁", "🈂️", "🈷️", 
        "🈶", "🈯", "🉐", "🈹", "🈚", "🈲", "🉑", "🈸", "🈴", "🈳", "㊗️", "㊙️", "🈺", "🈵", "🔴", 
        "🟠", "🟡", "🟢", "🔵", "🟣", "🟤", "⚫", "⚪", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫"
    ],
    "Activités": [
        "🎯", "🎮", "🎲", "🧩", "🎭", "🎨", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🪕", 
        "🎻", "🎬", "🏹", "🥌", "🛷", "🎿", "⛸️", "🛼", "🩰", "🎽", "🎾", "🏉", "🏈", "🏐", "🏀", 
        "⚾", "🥎", "🏏", "🏑", "🏒", "🥍", "🏓", "🏸", "🥊", "🥋", "🥅", "⛳", "⛸️", "🎣", "🎽", 
        "🎿", "🛷", "🥌", "🎯", "🪀", "🪁", "🎱", "🎮", "🎰", "🎲", "🧩", "♟️", "🎭", "🎨", "🧵", 
        "🧶", "🎼", "🎤", "🎧", "🎷", "🎸", "🎹", "🎺", "🎻", "🥁", "🪘", "🪗", "🪕"
    ],
    "Animaux": [
        "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", 
        "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", 
        "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", 
        "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", 
        "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🦣", "🐘", 
        "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🦬", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", 
        "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐈‍⬛", "🪶", "🐓", "🦃", "🦤", "🦚", "🦜", 
        "🦢", "🦩", "🕊️", "🐇", "🦝", "🦨", "🦡", "🦦", "🦫", "🦭", "🐿️", "🦔"
    ],
    "Météo": [
        "🌡️", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", 
        "💨", "🌪️", "🌫️", "🌊", "💧", "💦", "☔", "⚡", "❄️", "☃️", "⛄", "🔥", "💥", "✨", "⭐", 
        "🌟", "💫", "⚡", "☄️", "💥", "🔥", "🌈", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", 
        "🌩️", "🌨️", "☃️", "⛄", "❄️", "🌬️", "💨", "🌊", "🌫️", "🌝", "🌚", "🌑", "🌒", "🌓", "🌔", 
        "🌕", "🌖", "🌗", "🌘", "🌙", "🪐", "⚡"
    ],
    "Plantes": [
        "🌱", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🌷", "🌹", "🥀", 
        "🌺", "🌸", "🌼", "🌻", "💐", "🌱", "🪴", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", 
        "🍁", "🍂", "🍃", "🪨", "🪵", "🌵", "🌴", "🌲", "🌳", "🌱", "🌿", "🍀", "🪴", "🪦", "🌷", 
        "🌹", "🥀", "🌺", "🌸", "🌼", "🌻", "💐"
    ]
}

@tricount_bp.route('/icons')
def icons_list():
    """Liste des icônes disponibles"""
    icons = Icon.query.all()
    
    # Récupérer tous les émojis utilisés dans la base de données
    used_emojis = {icon.unicode_emoji for icon in icons}
    
    # Sélectionner 100 émojis aléatoires qui ne sont pas déjà utilisés
    available_emojis = []
    
    # Aplatir toutes les catégories d'émojis en une seule liste
    all_emojis = []
    for category, emoji_list in EMOJI_CATEGORIES.items():
        all_emojis.extend(emoji_list)
    
    # Filtrer les émojis non utilisés
    unused_emojis = [emoji for emoji in all_emojis if emoji not in used_emojis]
    
    # Si nous avons plus de 100 émojis disponibles, sélectionner 100 aléatoirement
    if len(unused_emojis) > 100:
        suggested_emojis = random.sample(unused_emojis, 100)
    else:
        suggested_emojis = unused_emojis
    
    # Organiser les émojis suggérés par catégorie pour l'affichage
    suggested_by_category = {}
    for category, emoji_list in EMOJI_CATEGORIES.items():
        category_suggestions = [emoji for emoji in suggested_emojis if emoji in emoji_list]
        if category_suggestions:
            suggested_by_category[category] = category_suggestions
    
    return render_template('tricount/icons.html', 
                          icons=icons, 
                          emoji_categories=EMOJI_CATEGORIES,
                          suggested_emojis=suggested_emojis,
                          suggested_by_category=suggested_by_category)

@tricount_bp.route('/icons/add', methods=['POST'])
def add_icon():
    """Ajouter une nouvelle icône"""
    name = request.form.get('name')
    description = request.form.get('description', '')
    font_awesome_class = request.form.get('font_awesome_class', '')  # Maintenant facultatif
    unicode_emoji = request.form.get('unicode_emoji')
    
    if not name or not unicode_emoji:
        flash('Le nom et l\'emoji Unicode sont requis.', 'warning')
        return redirect(url_for('tricount.icons_list'))
    
    icon = Icon(
        name=name, 
        description=description,
        font_awesome_class=font_awesome_class,  # Peut être vide
        unicode_emoji=unicode_emoji
    )
    
    db.session.add(icon)
    
    try:
        db.session.commit()
        flash(f'Icône "{name}" ajoutée avec succès.', 'success')
    except IntegrityError:
        db.session.rollback()
        flash(f'Une icône avec le nom "{name}" existe déjà.', 'danger')
    
    return redirect(url_for('tricount.icons_list'))

@tricount_bp.route('/icons/update/<int:icon_id>', methods=['POST'])
def update_icon(icon_id):
    """Mettre à jour une icône"""
    icon = Icon.query.get_or_404(icon_id)
    
    name = request.form.get('name')
    description = request.form.get('description', '')
    font_awesome_class = request.form.get('font_awesome_class', '')  # Maintenant facultatif
    unicode_emoji = request.form.get('unicode_emoji')
    
    if not name or not unicode_emoji:
        flash('Le nom et l\'emoji Unicode sont requis.', 'warning')
        return redirect(url_for('tricount.icons_list'))
    
    try:
        icon.name = name
        icon.description = description
        icon.font_awesome_class = font_awesome_class  # Peut être vide
        icon.unicode_emoji = unicode_emoji
        
        db.session.commit()
        flash(f'Icône "{name}" mise à jour avec succès.', 'success')
    except IntegrityError:
        db.session.rollback()
        flash(f'Une icône avec le nom "{name}" existe déjà.', 'danger')
    
    return redirect(url_for('tricount.icons_list'))

@tricount_bp.route('/icons/delete/<int:icon_id>', methods=['POST'])
def delete_icon(icon_id):
    """Supprimer une icône"""
    icon = Icon.query.get_or_404(icon_id)
    
    try:
        db.session.delete(icon)
        db.session.commit()
        flash(f'Icône "{icon.name}" supprimée avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la suppression de l\'icône: {str(e)}', 'danger')
    
    return redirect(url_for('tricount.icons_list'))

@tricount_bp.route('/icons/api/list')
def get_icons():
    """API pour récupérer la liste des icônes au format JSON"""
    icons = Icon.query.all()
    icons_data = [{
        'id': icon.id,
        'name': icon.name,
        'description': icon.description,
        'font_awesome_class': icon.font_awesome_class,
        'unicode_emoji': icon.unicode_emoji
    } for icon in icons]
    
    return jsonify({
        'success': True,
        'icons': icons_data
    })