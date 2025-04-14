# app/services/tricount/bank_statement_parser.py
import re
from datetime import datetime
from app.utils.money_helpers import clean_amount_string

class SocieteGeneraleParser:
    """Parser pour les relevés de compte de Société Générale"""
    
    @staticmethod
    def parse_statement(text):
        """
        Parse le texte copié depuis le relevé Société Générale et extrait les transactions
        
        Args:
            text (str): Texte brut du relevé bancaire
            
        Returns:
            list: Liste des transactions extraites sous forme de dictionnaires
        """
        transactions = []
        current_date = None
        
        # Nettoyer le texte
        text = text.strip()
        
        # Diviser en lignes
        lines = text.split('\n')
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Rechercher une ligne de date
            date_match = re.match(r'^(\w+)\s+(\d+)\s+(\w+)\s+(\d{4})$', line)
            if date_match:
                # Extraire et formater la date
                day_name, day, month, year = date_match.groups()
                month_num = SocieteGeneraleParser._convert_month_to_num(month)
                current_date = datetime(int(year), month_num, int(day))
                i += 1
                continue
            
            # Rechercher une ligne de transaction carte
            card_transaction_match = re.match(r'^CARTE\s+([^\s]+)\s+(\d{2}/\d{2})\s+(.+)$', line)
            if card_transaction_match and current_date and i + 1 < len(lines):
                card_num, transaction_date, description = card_transaction_match.groups()
                
                # Ligne suivante contient le montant
                amount_line = lines[i + 1].strip()
                amount_match = re.match(r'^moins-\s*([\d\s,]+)\s*€$', amount_line)
                
                if amount_match:
                    amount_str = amount_match.group(1)
                    amount = clean_amount_string(amount_str)
                    
                    # Créer la transaction
                    transaction = {
                        'date': current_date,
                        'description': description,
                        'amount': amount,
                        'is_debit': True,  # C'est une dépense (moins-)
                        'payment_method': f'CARTE {card_num}',
                        'transaction_date': SocieteGeneraleParser._parse_transaction_date(transaction_date, current_date),
                        'merchant': SocieteGeneraleParser._extract_merchant(description),
                        'original_text': line + '\n' + amount_line
                    }
                    
                    transactions.append(transaction)
                    i += 2  # Avancer de 2 lignes (ligne de transaction + ligne de montant)
                    continue
            
            # Rechercher un virement reçu
            vir_recu_match = re.match(r'^VIR\s+RECU\s+DE:\s+(.+)$', line)
            if vir_recu_match and current_date and i + 1 < len(lines):
                sender = vir_recu_match.group(1)
                
                # Ligne suivante peut contenir un motif ou un montant
                next_line = lines[i + 1].strip()
                motif_match = re.match(r'^Motif\s*:\s*(.+)$', next_line)
                
                if motif_match:
                    motif = motif_match.group(1)
                    
                    # La ligne suivante devrait contenir le montant
                    if i + 2 < len(lines):
                        amount_line = lines[i + 2].strip()
                        amount_match = re.match(r'^([\d\s,]+)\s*€$', amount_line)
                        
                        if amount_match:
                            amount_str = amount_match.group(1)
                            amount = clean_amount_string(amount_str)
                            
                            transaction = {
                                'date': current_date,
                                'description': f"Virement reçu de {sender} - {motif}",
                                'amount': amount,
                                'is_debit': False,  # C'est un crédit
                                'payment_method': 'VIREMENT',
                                'merchant': sender,
                                'reference': motif,
                                'original_text': '\n'.join([line, next_line, amount_line])
                            }
                            
                            transactions.append(transaction)
                            i += 3  # Avancer de 3 lignes
                            continue
                else:
                    # Vérifier si c'est directement un montant
                    amount_match = re.match(r'^([\d\s,]+)\s*€$', next_line)
                    if amount_match:
                        amount_str = amount_match.group(1)
                        amount = clean_amount_string(amount_str)
                        
                        transaction = {
                            'date': current_date,
                            'description': f"Virement reçu de {sender}",
                            'amount': amount,
                            'is_debit': False,  # C'est un crédit
                            'payment_method': 'VIREMENT',
                            'merchant': sender,
                            'original_text': '\n'.join([line, next_line])
                        }
                        
                        transactions.append(transaction)
                        i += 2  # Avancer de 2 lignes
                        continue
            
            # Rechercher un virement émis
            vir_emis_match = re.match(r'^(VIR\s+PERM|VIR\s+INSTANTANE\s+EMIS)\s+POUR:\s+(.+)$', line)
            if vir_emis_match and current_date and i + 1 < len(lines):
                vir_type, recipient = vir_emis_match.groups()
                
                # Ligne suivante peut contenir un motif ou un montant
                next_line = lines[i + 1].strip()
                motif_match = re.match(r'^Motif\s*:\s*(.+)$', next_line)
                
                if motif_match:
                    motif = motif_match.group(1)
                    
                    # La ligne suivante devrait contenir le montant
                    if i + 2 < len(lines):
                        amount_line = lines[i + 2].strip()
                        amount_match = re.match(r'^moins-\s*([\d\s,]+)\s*€$', amount_line)
                        
                        if amount_match:
                            amount_str = amount_match.group(1)
                            amount = clean_amount_string(amount_str)
                            
                            transaction = {
                                'date': current_date,
                                'description': f"{vir_type} à {recipient} - {motif}",
                                'amount': amount,
                                'is_debit': True,  # C'est un débit
                                'payment_method': vir_type,
                                'merchant': recipient,
                                'reference': motif,
                                'original_text': '\n'.join([line, next_line, amount_line])
                            }
                            
                            transactions.append(transaction)
                            i += 3  # Avancer de 3 lignes
                            continue
                else:
                    # Vérifier si c'est directement un montant
                    amount_match = re.match(r'^moins-\s*([\d\s,]+)\s*€$', next_line)
                    if amount_match:
                        amount_str = amount_match.group(1)
                        amount = clean_amount_string(amount_str)
                        
                        transaction = {
                            'date': current_date,
                            'description': f"{vir_type} à {recipient}",
                            'amount': amount,
                            'is_debit': True,  # C'est un débit
                            'payment_method': vir_type,
                            'merchant': recipient,
                            'original_text': '\n'.join([line, next_line])
                        }
                        
                        transactions.append(transaction)
                        i += 2  # Avancer de 2 lignes
                        continue
            
            # Rechercher un prélèvement
            prelevement_match = re.match(r'^PRELEVEMENT\s+EUROPEEN\s+(DE|POUR\s+CPTE\s+DE):\s*(.+)$', line)
            if prelevement_match and current_date and i + 1 < len(lines):
                _, creditor = prelevement_match.groups()
                
                # Ligne suivante peut contenir un motif ou un montant
                next_line = lines[i + 1].strip()
                motif_match = re.match(r'^Motif\s*:\s*(.+)$', next_line)
                
                if motif_match:
                    motif = motif_match.group(1)
                    
                    # La ligne suivante devrait contenir le montant
                    if i + 2 < len(lines):
                        amount_line = lines[i + 2].strip()
                        amount_match = re.match(r'^moins-\s*([\d\s,]+)\s*€$', amount_line)
                        
                        if amount_match:
                            amount_str = amount_match.group(1)
                            amount = clean_amount_string(amount_str)
                            
                            # Extraire une référence ou un mandat s'il existe
                            ref_match = re.search(r'REF:\s+([^\s]+)', motif)
                            mandat_match = re.search(r'MANDAT\s+([^\s]+)', motif)
                            
                            reference = None
                            if ref_match:
                                reference = ref_match.group(1)
                            elif mandat_match:
                                reference = f"MANDAT {mandat_match.group(1)}"
                            
                            transaction = {
                                'date': current_date,
                                'description': f"Prélèvement {creditor} - {motif}",
                                'amount': amount,
                                'is_debit': True,  # C'est un débit
                                'payment_method': 'PRELEVEMENT',
                                'merchant': creditor,
                                'reference': reference or motif,
                                'original_text': '\n'.join([line, next_line, amount_line])
                            }
                            
                            transactions.append(transaction)
                            i += 3  # Avancer de 3 lignes
                            continue
            
            # Si aucun des motifs n'a été trouvé, passer à la ligne suivante
            i += 1
        
        return transactions
    
    @staticmethod
    def _convert_month_to_num(month_name):
        """Convertit un nom de mois en français en numéro de mois"""
        months = {
            'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6,
            'juillet': 7, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
        }
        return months.get(month_name.lower(), 1)  # Par défaut janvier si non trouvé
    
    @staticmethod
    def _parse_transaction_date(date_str, statement_date):
        """Convertit une date de transaction au format DD/MM en objet datetime"""
        try:
            day, month = map(int, date_str.split('/'))
            year = statement_date.year
            
            # Si le mois est plus grand que le mois actuel, c'est probablement l'année précédente
            if month > statement_date.month:
                year -= 1
                
            return datetime(year, month, day)
        except (ValueError, AttributeError):
            return statement_date  # Retourner la date du relevé en cas d'erreur
    
    @staticmethod
    def _extract_merchant(description):
        """Extrait le nom du commerçant à partir de la description"""
        # Ignorer les suffixes communs
        suffixes = ['COMMERCE ELECTRONIQUE', 'EUR IRLANDE', 'EUR LUXEMBOURG']
        merchant = description
        
        for suffix in suffixes:
            if suffix in merchant:
                merchant = merchant.split(suffix)[0].strip()
        
        return merchant

class N26Parser:
    """Parser pour les relevés de compte au format CSV de N26"""
    
    @staticmethod
    def parse_csv(csv_content):
        """
        Parse le contenu CSV de N26 et extrait les transactions
        
        Args:
            csv_content (str): Contenu CSV du relevé bancaire
            
        Returns:
            list: Liste des transactions extraites sous forme de dictionnaires
        """
        transactions = []
        
        # Utiliser le module csv pour analyser le contenu
        import csv
        from io import StringIO
        from decimal import Decimal
        
        csv_file = StringIO(csv_content)
        reader = csv.DictReader(csv_file)
        
        for row in reader:
            # Extraire les informations pertinentes
            booking_date = row.get('Booking Date')
            value_date = row.get('Value Date')
            partner_name = row.get('Partner Name', '')
            partner_iban = row.get('Partner Iban', '')
            transaction_type = row.get('Type', '')
            payment_reference = row.get('Payment Reference', '')
            amount_str = row.get('Amount (EUR)', '0')
            original_amount = row.get('Original Amount', '0')
            original_currency = row.get('Original Currency', 'EUR')
            
            # Vérification des données essentielles
            if not booking_date or not amount_str:
                continue
            
            # Convertir la date
            try:
                # Format N26: YYYY-MM-DD
                date_obj = datetime.strptime(booking_date, '%Y-%m-%d')
            except (ValueError, TypeError):
                # En cas d'erreur, utiliser la date actuelle
                date_obj = datetime.utcnow()
            
            # Déterminer si c'est un débit ou un crédit
            # N26 utilise des montants négatifs pour les débits
            try:
                amount = Decimal(amount_str.replace(',', '.'))
                is_debit = amount < 0
                # Stocker le montant en valeur absolue
                amount = abs(amount)
            except (ValueError, decimal.InvalidOperation):
                # Si la conversion échoue, essayer de nettoyer davantage
                amount_str = amount_str.replace(',', '.')
                try:
                    amount = Decimal(''.join(c for c in amount_str if c.isdigit() or c == '.'))
                    is_debit = '-' in amount_str
                    amount = abs(amount)
                except (ValueError, decimal.InvalidOperation):
                    # Dernier recours, mettre 0
                    amount = Decimal('0')
                    is_debit = True
            
            # Identifier le type de paiement
            payment_method = N26Parser._determine_payment_method(transaction_type, partner_name)
            
            # Créer la description
            description = N26Parser._create_description(partner_name, payment_reference, transaction_type)
            
            # Créer une représentation de l'original pour référence
            original_text = '|'.join([
                booking_date, 
                partner_name or '', 
                transaction_type or '', 
                payment_reference or '',
                amount_str or '0'
            ])
            
            transaction = {
                'date': date_obj,
                'description': description,
                'amount': amount,
                'is_debit': is_debit,
                'payment_method': payment_method,
                'merchant': partner_name,
                'reference': payment_reference,
                'original_text': original_text
            }
            
            transactions.append(transaction)
        
        return transactions
    
    @staticmethod
    def _determine_payment_method(transaction_type, partner_name):
        """
        Détermine le type de paiement basé sur le type de transaction et le partenaire
        
        Args:
            transaction_type (str): Type de transaction (Presentment, MasterCard, etc.)
            partner_name (str): Nom du partenaire
            
        Returns:
            str: Méthode de paiement (CARTE, VIREMENT, etc.)
        """
        # Mapper les types de transaction N26 vers des catégories plus génériques
        type_mapping = {
            'Presentment': 'CARTE',
            'MasterCard Payment': 'CARTE',
            'CreditTransfer': 'VIREMENT',
            'DirectDebit': 'PRELEVEMENT',
            'Transfer': 'VIREMENT',
            'Income': 'VIREMENT',
            'Outgoing Transfer': 'VIREMENT',
            'Withdrawal': 'RETRAIT'
        }
        
        # Utiliser le mapping ou retourner le type original si non trouvé
        return type_mapping.get(transaction_type, transaction_type)
    
    @staticmethod
    def _create_description(partner_name, payment_reference, transaction_type):
        """
        Crée une description basée sur les informations disponibles
        
        Args:
            partner_name (str): Nom du partenaire
            payment_reference (str): Référence du paiement
            transaction_type (str): Type de transaction
            
        Returns:
            str: Description formatée
        """
        # Commencer avec le nom du partenaire
        description = partner_name if partner_name else ''
        
        # Ajouter la référence si elle existe
        if payment_reference:
            if description:
                description += f" - {payment_reference}"
            else:
                description = payment_reference
        
        # Si ni le partenaire ni la référence n'existent, utiliser le type
        if not description and transaction_type:
            description = f"Transaction {transaction_type}"
        
        # Si aucune information n'est disponible
        if not description:
            description = "Transaction N26"
        
        return description