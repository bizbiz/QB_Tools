# app/services/tricount/__init__.py

from app.services.tricount.bank_statement_parser import SocieteGeneraleParser, N26Parser
from app.services.tricount.auto_categorization import AutoCategorizationService