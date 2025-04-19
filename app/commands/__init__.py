# app/commands/__init__.py
"""
Package pour les commandes CLI personnalisées.
"""

def register_commands(app):
    """Enregistre les commandes existantes du module tricount"""
    from app.commands.tricount_commands import init_tricount_categories, tricount_init, migrate_merchant_names
    
    app.cli.add_command(init_tricount_categories)
    app.cli.add_command(tricount_init)
    app.cli.add_command(migrate_merchant_names)