require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. KONFIGURACE CORS ---
// Povoluje komunikaci z tvého GitHub Pages frontendu
const allowedOrigins = [
  'http://localhost:5173',                 // Lokální vývoj
  'https://supptdexoart-sudo.github.io',   // Tvoje GitHub Pages
  'https://nexus-game-companion.web.app'   // Alternativa
];

app.use(cors({
  origin: function (origin, callback) {
    // Povolit požadavky bez origin (např. Postman/Curl) nebo pokud je v seznamu
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("Blokován CORS:", origin);
      callback(null, true); // Pro vývoj povolíme vše, v produkci změň na callback(new Error(...))
    }
  },
  credentials: true
}));

app.use(express.json());

// --- 2. NASTAVENÍ EMAILU (NODEMAILER) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Nastaveno na Render.com
    pass: process.env.EMAIL_PASS  // Nastaveno na Render.com
  }
});

// --- 3. IN-MEMORY DATABÁZE (Data zmizí při restartu serveru - pro trvalost je třeba MongoDB) ---
const users = new Set(); // Seznam registrovaných emailů
const inventories = {};  // Ukládání karet: { 'email': [karty] }
const nicknames = {};    // Ukládání přezdívek
const rooms = {};        // Chatovací místnosti

// --- 4. ENDPOINTY ---

// Test serveru
app.get('/', (req, res) => {
  res.send('Nexus Backend is Running v1.0');
});

// PŘIHLÁŠENÍ / REGISTRACE + NOTIFIKACE ADMINOVI
app.post('/api/auth/login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email chybí' });

  const isNewUser = !users.has(email);
  
  if (isNewUser) {
    users.add(email);
    // Inicializace prázdného inventáře pro nového uživatele
    if (!inventories[email]) inventories[email] = [];

    console.log(`Nový uživatel: ${email}`);

    // Odeslání emailu Adminovi
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'zbynekbal97@gmail.com',
      subject: '🚀 NEXUS: Nový hráč se připojil!',
      text: `Ahoj admine,\n\nDo systému se registroval nový hráč.\n\nEmail: ${email}\nDatum: ${new Date().toLocaleString()}\n\n-- Nexus System`
    };

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        console.log('Notifikace odeslána.');
      } else {
        console.log('Email credentials chybí, email neodeslán.');
      }
    } catch (error) {
      console.error('Chyba odesílání emailu:', error);
    }
  }

  res.json({ email, isNewUser, message: 'Success' });
});

// ZÍSKÁNÍ INVENTÁŘE
app.get('/api/inventory/:email', (req, res) => {
  const { email } = req.params;
  const data = inventories[email] || [];
  res.json(data);
});

// ZÍSKÁNÍ KONKRÉTNÍ KARTY
app.get('/api/inventory/:email/:cardId', (req, res) => {
  const { email, cardId } = req.params;
  const userInv = inventories[email] || [];
  const card = userInv.find(c => c.id === cardId);
  
  if (card) {
    res.json(card);
  } else {
    // Pokud není u uživatele, zkusíme "Admin DB" (mocknuté)
    if (email !== 'zbynekbal97@gmail.com' && inventories['zbynekbal97@gmail.com']) {
        const adminCard = inventories['zbynekbal97@gmail.com'].find(c => c.id === cardId);
        if (adminCard) return res.json(adminCard);
    }
    res.status(404).json({ message: 'Karta nenalezena' });
  }
});

// ULOŽENÍ KARTY (Přidání)
app.post('/api/inventory/:email', (req, res) => {
  const { email } = req.params;
  const card = req.body;
  
  if (!inventories[email]) inventories[email] = [];
  
  // Odstranění duplicit pokud existují
  inventories[email] = inventories[email].filter(c => c.id !== card.id);
  inventories[email].push(card);
  
  console.log(`Uložena karta ${card.id} pro ${email}`);
  res.json(card);
});

// AKTUALIZACE KARTY
app.put('/api/inventory/:email/:cardId', (req, res) => {
  const { email, cardId } = req.params;
  const updatedCard = req.body;
  
  if (!inventories[email]) inventories[email] = [];
  
  const index = inventories[email].findIndex(c => c.id === cardId);
  if (index !== -1) {
    inventories[email][index] = updatedCard;
    res.json(updatedCard);
  } else {
    inventories[email].push(updatedCard);
    res.json(updatedCard);
  }
});

// SMAZÁNÍ KARTY
app.delete('/api/inventory/:email/:cardId', (req, res) => {
  const { email, cardId } = req.params;
  if (inventories[email]) {
    inventories[email] = inventories[email].filter(c => c.id !== cardId);
  }
  res.json({ message: 'Deleted' });
});

// PŘEZDÍVKY
app.post('/api/users/:email/nickname', (req, res) => {
    const { email } = req.params;
    const { nickname } = req.body;
    nicknames[email] = nickname;
    res.json({ message: 'Saved' });
});

app.get('/api/users/:email/nickname', (req, res) => {
    const { email } = req.params;
    res.json({ nickname: nicknames[email] || '' });
});

// MÍSTNOSTI A CHAT (Zjednodušená verze)
app.post('/api/rooms', (req, res) => {
    const { roomId } = req.body;
    if(!rooms[roomId]) rooms[roomId] = [];
    res.json({ message: 'Room created' });
});

app.post('/api/rooms/:roomId/join', (req, res) => {
    res.json({ message: 'Joined' });
});

app.get('/api/rooms/:roomId/messages', (req, res) => {
    const { roomId } = req.params;
    res.json(rooms[roomId] || []);
});

app.post('/api/rooms/:roomId/messages', (req, res) => {
    const { roomId } = req.params;
    const { sender, text } = req.body;
    if(!rooms[roomId]) rooms[roomId] = [];
    
    const msg = {
        id: Date.now().toString(),
        sender,
        text,
        timestamp: Date.now()
    };
    rooms[roomId].push(msg);
    
    // Omezíme historii na 50 zpráv
    if (rooms[roomId].length > 50) rooms[roomId].shift();
    
    res.json(msg);
});

app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});