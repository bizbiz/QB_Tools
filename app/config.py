#app/config.py

import os
from datetime import timedelta

class Config:
    # Dans app/config.py, ligne 4 :
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://postgres_u_qb_tools:password_qb@qb_tools_db:5432/qb_tools_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'clé_secrète_dev')
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "connect_args": {
            "options": "-c statement_timeout=60000"
        }
    }
    
    # Nouvelles configurations de sécurité
    SESSION_COOKIE_NAME = 'qb_tools_session'
    SESSION_REFRESH_EACH_REQUEST = True

class ProdConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True  # HTTPS obligatoire en production

class DevConfig(Config):
    DEBUG = True
    SESSION_COOKIE_SECURE = False  # Autoriser HTTP en développement
    TEMPLATES_AUTO_RELOAD = True

config = {
    'development': DevConfig,
    'production': ProdConfig,
    'default': DevConfig
}
