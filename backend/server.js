const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'barbershop-super-secret-key-change-in-production';
const DB_FILE = path.join(__dirname, 'data.json');
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend-client')));

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { admins: [], clients: [], stamps: [], rewards: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

(async () => {
  const db = readDB();
  if (db.admins.length === 0) {
    const hashed = await bcrypt.hash('admin123', 10);
    db.admins.push({ id: uuidv4(), username: 'admin', password: hashed, name: 'Administrador', createdAt: new Date().toISOString() });
    writeDB(db);
    console.log('✅ Admin criado: admin / admin123');
  }
})();

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token necessário' });
  try { req.admin = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token inválido' }); }
}

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const admin = db.admins.find(a => a.username === username);
  if (!admin || !(await bcrypt.compare(password, admin.password))) return res.status(401).json({ error: 'Credenciais inválidas' });
  const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, admin: { id: admin.id, username: admin.username, name: admin.name } });
});

app.get('/api/card/:clientId', (req, res) => {
  const db = readDB();
  const client = db.clients.find(c => c.id === req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  const stamps = db.stamps.filter(s => s.clientId === client.id);
  const rewards = db.rewards.filter(r => r.clientId === client.id);
  const totalStamps = stamps.length;
  const STAMPS_NEEDED = 8;
  const currentStamps = totalStamps % STAMPS_NEEDED;
  res.json({ client: { id: client.id, name: client.name, phone: client.phone, createdAt: client.createdAt }, currentStamps, stampsNeeded: STAMPS_NEEDED, totalRewards: rewards.length, stamps: stamps.slice(-20), rewards: rewards.slice(-10) });
});

app.post('/api/clients/register', async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Nome e telemóvel obrigatórios' });
  const db = readDB();
  const exists = db.clients.find(c => c.phone === phone);
  if (exists) return res.json({ client: exists, message: 'Já registado' });
  const client = { id: uuidv4(), name: name.trim(), phone: phone.trim(), createdAt: new Date().toISOString() };
  db.clients.push(client);
  writeDB(db);
  const cardUrl = `${BASE_URL}/card/${client.id}`;
  const qrDataUrl = await QRCode.toDataURL(cardUrl);
  res.status(201).json({ client, cardUrl, qrCode: qrDataUrl });
});

app.get('/api/admin/clients', authMiddleware, (req, res) => {
  const db = readDB();
  const STAMPS_NEEDED = 8;
  const clients = db.clients.map(client => {
    const stamps = db.stamps.filter(s => s.clientId === client.id);
    const rewards = db.rewards.filter(r => r.clientId === client.id);
    return { ...client, totalStamps: stamps.length, currentStamps: stamps.length % STAMPS_NEEDED, totalRewards: rewards.length, lastVisit: stamps.length > 0 ? stamps[stamps.length - 1].createdAt : null };
  });
  res.json(clients);
});

app.post('/api/admin/stamp', authMiddleware, (req, res) => {
  const { clientId, note } = req.body;
  if (!clientId) return res.status(400).json({ error: 'clientId obrigatório' });
  const db = readDB();
  const client = db.clients.find(c => c.id === clientId);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  const stamp = { id: uuidv4(), clientId, note: note || '', createdAt: new Date().toISOString(), adminId: req.admin.id };
  db.stamps.push(stamp);
  const STAMPS_NEEDED = 8;
  const totalStamps = db.stamps.filter(s => s.clientId === clientId).length;
  let reward = null;
  if (totalStamps % STAMPS_NEEDED === 0) {
    reward = { id: uuidv4(), clientId, type: 'Corte Grátis', earnedAt: new Date().toISOString(), used: false, usedAt: null };
    db.rewards.push(reward);
  }
  writeDB(db);
  res.json({ stamp, reward, currentStamps: totalStamps % STAMPS_NEEDED, totalStamps, message: reward ? '🎉 Cliente ganhou corte grátis!' : 'Carimbo adicionado!' });
});

app.post('/api/admin/reward/use', authMiddleware, (req, res) => {
  const { rewardId } = req.body;
  const db = readDB();
  const reward = db.rewards.find(r => r.id === rewardId);
  if (!reward) return res.status(404).json({ error: 'Recompensa não encontrada' });
  if (reward.used) return res.status(400).json({ error: 'Recompensa já usada' });
  reward.used = true; reward.usedAt = new Date().toISOString();
  writeDB(db);
  res.json({ reward, message: 'Recompensa marcada como usada' });
});

app.get('/api/admin/stats', authMiddleware, (req, res) => {
  const db = readDB();
  const today = new Date().toISOString().split('T')[0];
  res.json({ totalClients: db.clients.length, totalStamps: db.stamps.length, totalRewards: db.rewards.length, rewardsUsed: db.rewards.filter(r => r.used).length, rewardsPending: db.rewards.filter(r => !r.used).length, stampsToday: db.stamps.filter(s => s.createdAt.startsWith(today)).length, newClientsToday: db.clients.filter(c => c.createdAt.startsWith(today)).length });
});

app.get('/api/admin/client/:id/qr', authMiddleware, async (req, res) => {
  const db = readDB();
  const client = db.clients.find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  const cardUrl = `${BASE_URL}/card/${client.id}`;
  const qrDataUrl = await QRCode.toDataURL(cardUrl, { width: 300 });
  res.json({ qrCode: qrDataUrl, cardUrl });
});

app.delete('/api/admin/client/:id', authMiddleware, (req, res) => {
  const db = readDB();
  const idx = db.clients.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Cliente não encontrado' });
  db.clients.splice(idx, 1);
  db.stamps = db.stamps.filter(s => s.clientId !== req.params.id);
  db.rewards = db.rewards.filter(r => r.clientId !== req.params.id);
  writeDB(db);
  res.json({ message: 'Cliente apagado' });
});

app.get('/card/:clientId', (req, res) => {
  res.sendFile('frontend-client/index.html', { root: path.join(__dirname, '..') });
});

app.get('/admin', (req, res) => {
  res.sendFile('frontend-admin/index.html', { root: path.join(__dirname, '..') });
});

app.get('/admin/:path', (req, res) => {
  res.sendFile('frontend-admin/index.html', { root: path.join(__dirname, '..') });
});

app.listen(PORT, () => {
  console.log(`\n🪒 Barbershop Loyalty API a correr em http://localhost:${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🔑 Login: admin / admin123\n`);
});
