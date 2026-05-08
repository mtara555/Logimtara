# LogiMtara Sécurité Pro v4.1 - Backend Professionnel

Architecture production pour Marjane Tanger - Guérite Sécurité

## Stack
- **API**: Node.js 20 + Express + TypeScript ready
- **DB**: PostgreSQL 16
- **Auth**: JWT + bcrypt, rôles RBAC
- **Déploiement**: Docker Compose

## Démarrage rapide
```bash
cd logimtara-backend
docker-compose up -d
# API: http://localhost:4000
# PGAdmin: http://localhost:5050
```

## Rôles
- **agent**: créer/terminer réceptions, voir fournisseurs
- **chef_securite**: + gérer fournisseurs, contacts, exports
- **admin**: + paramètres, utilisateurs, audit

## Endpoints principaux
POST /api/auth/login
GET /api/receptions
POST /api/receptions
PATCH /api/receptions/:id/terminer
GET /api/fournisseurs
POST /api/fournisseurs
