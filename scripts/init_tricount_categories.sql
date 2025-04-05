-- Initialisation des catégories par défaut pour Tricount Helper
-- À exécuter dans pgAdmin4 si la commande Flask ne fonctionne pas

-- Supprimer les catégories existantes (optionnel, à utiliser avec précaution)
-- DELETE FROM expense_categories;

-- Ajouter les catégories par défaut
INSERT INTO expense_categories (name, description, created_at)
VALUES
    ('Alimentation', 'Courses alimentaires, restaurants, cafés', NOW()),
    ('Logement', 'Loyer, charges, électricité, eau, internet, assurance habitation', NOW()),
    ('Transport', 'Transports en commun, essence, péages, entretien véhicule', NOW()),
    ('Santé', 'Médecin, pharmacie, mutuelle', NOW()),
    ('Loisirs', 'Sorties, cinéma, sports, abonnements', NOW()),
    ('Vacances', 'Voyages, hôtels, billets d''avion', NOW()),
    ('Shopping', 'Vêtements, électronique, décoration', NOW()),
    ('Services', 'Coiffeur, pressing, services divers', NOW()),
    ('Abonnements', 'Netflix, Spotify, téléphone, etc.', NOW()),
    ('Éducation', 'Cours, livres, formations', NOW()),
    ('Cadeaux', 'Cadeaux offerts à d''autres personnes', NOW()),
    ('Impôts & taxes', 'Impôts sur le revenu, taxe d''habitation', NOW()),
    ('Épargne', 'Virements vers des comptes d''épargne', NOW()),
    ('Revenus', 'Salaires, primes, dividendes', NOW()),
    ('Dépenses professionnelles', 'Dépenses liées au travail, à rembourser par l''employeur', NOW()),
    ('Frais bancaires', 'Commissions, frais de tenue de compte', NOW()),
    ('Divers', 'Autres dépenses non catégorisables', NOW())
ON CONFLICT (name) DO NOTHING;

-- Vérifier que les catégories ont été ajoutées
SELECT * FROM expense_categories;