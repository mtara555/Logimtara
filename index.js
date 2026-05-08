require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 15*60*1000, max: 300 }));

// --- AUTH MIDDLEWARE ---
function auth(requiredRoles = []) {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Token manquant' });
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      if (requiredRoles.length && !requiredRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'Accès refusé' });
      }
      next();
    } catch (e) {
      res.status(401).json({ error: 'Token invalide' });
    }
  };
}

// --- AUTH ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1 AND actif=true', [email]);
  const user = rows[0];
  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
  const token = jwt.sign({ id: user.id, role: user.role, nom: user.nom }, process.env.JWT_SECRET, { expiresIn: '8h' });
  await pool.query('INSERT INTO audit_logs(user_id, action, details) VALUES($1,$2,$3)', [user.id, 'LOGIN', { ip: req.ip }]);
  res.json({ token, user: { id: user.id, nom: user.nom, role: user.role, email: user.email } });
});

// --- RECEPTIONS ---
app.get('/api/receptions', auth(), async (req, res) => {
  const { date, statut, type } = req.query;
  let q = `SELECT r.*, f.nom as fournisseur_nom, f.cnuf FROM receptions r LEFT JOIN fournisseurs f ON f.id=r.fournisseur_id WHERE 1=1`;
  const params = [];
  if (date) { params.push(date); q += ` AND r.date=$${params.length}`; }
  if (statut) { params.push(statut); q += ` AND r.statut=$${params.length}`; }
  if (type) { params.push(type); q += ` AND r.type=$${params.length}`; }
  q += ' ORDER BY r.created_at DESC LIMIT 200';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

app.post('/api/receptions', auth(['agent','chef_securite','admin']), async (req, res) => {
  const { fournisseur_id, immatriculation, type, num_commande, num_bl, observations } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO receptions(fournisseur_id, immatriculation, type, num_commande, num_bl, observations, heure_entree, date, statut, created_by)
     VALUES($1,$2,$3,$4,$5,$6, CURRENT_TIME, CURRENT_DATE, 'En cours', $7) RETURNING *`,
    [fournisseur_id, immatriculation, type, num_commande, num_bl, observations, req.user.id]
  );
  await pool.query('INSERT INTO audit_logs(user_id, action, details) VALUES($1,$2,$3)', [req.user.id, 'RECEPTION_CREATE', { id: rows[0].id }]);
  res.status(201).json(rows[0]);
});

app.patch('/api/receptions/:id/terminer', auth(['agent','chef_securite','admin']), async (req, res) => {
  const { heure_sortie, num_enregistrement, num_bon_retour } = req.body;
  const { rows } = await pool.query(
    `UPDATE receptions SET heure_sortie=$1, num_enregistrement=$2, num_bon_retour=$3, statut='Terminée', updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [heure_sortie, num_enregistrement, num_bon_retour, req.params.id]
  );
  res.json(rows[0]);
});

// --- FOURNISSEURS ---
app.get('/api/fournisseurs', auth(), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM fournisseurs WHERE actif=true ORDER BY nom');
  res.json(rows);
});

app.post('/api/fournisseurs', auth(['chef_securite','admin']), async (req, res) => {
  const { nom, cnuf, contact, telephone } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO fournisseurs(nom, cnuf, contact, telephone) VALUES($1,$2,$3,$4) RETURNING *',
    [nom, cnuf, contact, telephone]
  );
  res.status(201).json(rows[0]);
});

// --- DASHBOARD ---
app.get('/api/dashboard/kpis', auth(), async (req, res) => {
  const today = new Date().toISOString().slice(0,10);
  const [a,b,c,d] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM receptions WHERE date=$1", [today]),
    pool.query("SELECT COUNT(*) FROM receptions WHERE statut='En cours'"),
    pool.query("SELECT COUNT(*) FROM receptions WHERE date=$1 AND statut='Terminée'", [today]),
    pool.query("SELECT COUNT(DISTINCT fournisseur_id) FROM receptions WHERE date >= CURRENT_DATE - INTERVAL '7 days'")
  ]);
  res.json({
    aujourdhui: parseInt(a.rows[0].count),
    en_cours: parseInt(b.rows[0].count),
    terminees: parseInt(c.rows[0].count),
    fournisseurs_actifs: parseInt(d.rows[0].count)
  });
});

// --- HEALTH ---
app.get('/health', (req,res)=>res.json({ ok:true, version:'4.1.0', env:'tanger' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=>console.log(`✓ LogiMtara API v4.1 sur port ${PORT}`));
