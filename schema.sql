-- LogiMtara Sécurité Pro v4.1 - Schéma PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('agent','chef_securite','admin')),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fournisseurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(150) NOT NULL,
  cnuf VARCHAR(30) UNIQUE,
  contact VARCHAR(100),
  telephone VARCHAR(20),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE receptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  heure_entree TIME NOT NULL DEFAULT CURRENT_TIME,
  heure_sortie TIME,
  fournisseur_id UUID REFERENCES fournisseurs(id),
  immatriculation VARCHAR(20) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('Frais','Non food')),
  num_commande VARCHAR(50),
  num_bl VARCHAR(50),
  num_enregistrement VARCHAR(50),
  num_bon_retour VARCHAR(50),
  statut VARCHAR(20) DEFAULT 'En cours',
  observations TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contacts_whatsapp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(100),
  fonction VARCHAR(100),
  whatsapp VARCHAR(20) NOT NULL,
  actif BOOLEAN DEFAULT true
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Données initiales
INSERT INTO users(nom,email,password_hash,role) VALUES
('Agent Guérite','agent@logimtara.ma','$2a$10$8K1p/a0dURXAm7QiT/.s8eJ6fXkL2pHjG9xO3mYqZvW4rT5u6v7W','agent'),
('Chef Sécurité','chef@logimtara.ma','$2a$10$8K1p/a0dURXAm7QiT/.s8eJ6fXkL2pHjG9xO3mYqZvW4rT5u6v7W','chef_securite'),
('Admin Tanger','admin@logimtara.ma','$2a$10$8K1p/a0dURXAm7QiT/.s8eJ6fXkL2pHjG9xO3mYqZvW4rT5u6v7W','admin');
-- Mot de passe pour tous: Logi2026!

INSERT INTO fournisseurs(nom,cnuf,contact,telephone) VALUES
('Centrale Danone Maroc','CNUF-524178','M. Bennani','0661123456'),
('Lesieur Cristal','CNUF-301245','Mme El Amrani','0662987654'),
('Copag','CNUF-412890','M. Fassi','0663554433'),
('Koutoubia','CNUF-589012','M. Idrissi','0664778899'),
('Aiguebelle','CNUF-234567','Mme Zahra','0665112233'),
('Maroc Lait','CNUF-678901','M. Alaoui','0666445566'),
('Dari Couspate','CNUF-345678','Mme Saadi','0667778899'),
('Sidi Ali','CNUF-901234','M. Tazi','0668889900');

INSERT INTO contacts_whatsapp(nom,fonction,whatsapp) VALUES
('Direction Magasin','Directeur','212661234567'),
('Réception Frais','Responsable','212662345678');
