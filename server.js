
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Pokus o načtení .env z aktuální složky I z kořenové složky
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
try {
    dotenv.config();
    dotenv.config({ path: path.join(__dirname, '../.env') });
} catch (e) { }

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { OAuth2Client } from 'google-auth-library';

const app = express();
const envPort = process.env.PORT;
const PORT = (envPort && envPort != 3000) ? envPort : 3001;
const MONGODB_URI = process.env.MONGODB_URI;
// Serverové ID (prioritní), pokud chybí, použije se to z requestu
const SERVER_GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const ADMIN_EMAIL = 'zbynekbal97@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nexus-master-key';

// --- WHITELIST POVOLENÝCH HRÁČŮ ---
// Pouze tyto emaily se mohou přihlásit přes Google
const ALLOWED_EMAILS = [
    'zbynekbal97@gmail.com',
    'bluegodablecz@gmail.com',
    'pharao1997@gmail.com'
];

console.log('\n🛡️ --- STARTUJI NEXUS BACKEND (SECURE MODE v1.9 - ADMIN FIX) ---');
console.log(`ℹ️  Server Client ID: ${SERVER_GOOGLE_CLIENT_ID ? 'LOADED' : 'NOT SET (Will use client-provided ID)'}`);
console.log(`🔒 Whitelist aktivní pro: ${ALLOWED_EMAILS.join(', ')}`);

// Pokud máme server ID, připravíme klienta předem
let googleClient = SERVER_GOOGLE_CLIENT_ID ? new OAuth2Client(SERVER_GOOGLE_CLIENT_ID) : null;

if (!MONGODB_URI) {
    console.error('❌ FATAL ERROR: Chybí MONGODB_URI!');
    process.exit(1);
} else {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('✅ ÚSPĚCH: MongoDB (Secured Connection) připojeno.'))
        .catch(err => console.error('❌ CHYBA MONGODB:', err.message));
}

app.use(helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
}));

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'https://supptdexoart-sudo.github.io'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            if (origin.endsWith('.github.io') || origin.includes('onrender.com')) {
                return callback(null, true);
            }
            return callback(null, true); // Pro vývoj povolíme vše, v ostrém provozu zpřísnit
        }
        return callback(null, true);
    },
    credentials: true
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "⛔ Příliš mnoho požadavků." }
});
app.use(limiter);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(mongoSanitize());

app.use((req, res, next) => {
    const isPolling = req.url.endsWith('/status') || req.url.endsWith('/messages');
    if (!isPolling) {
        console.log(`📩 ${req.method} ${req.url}`);
    }
    next();
});

// --- SCHEMAS (Zjednodušené pro přehlednost) ---
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    nickname: String,
    playerClass: String,
    inventory: [Object],
    friends: [String],
    requests: [{ fromEmail: String, timestamp: Number }]
}, { timestamps: true });

const RoomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true, uppercase: true },
    password: { type: String, default: null },
    host: String,
    isGameStarted: { type: Boolean, default: false },
    roundNumber: { type: Number, default: 0 },
    turnIndex: { type: Number, default: 0 },
    turnOrder: [String],
    readyForNextRound: [String],
    members: [{ name: String, email: String, hp: Number, lastSeen: Number, isReady: { type: Boolean, default: false } }],
    messages: [{ id: String, sender: String, text: String, timestamp: Number, isSystem: Boolean }],
    activeEncounter: Object
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Room = mongoose.model('Room', RoomSchema);

const getOrCreateUser = async (rawEmail) => {
    if (!rawEmail || typeof rawEmail !== 'string') return null;
    const email = rawEmail.toLowerCase().trim();
    let user = await User.findOne({ email });
    if (!user) {
        user = await User.create({ email, nickname: email.split('@')[0], inventory: [], friends: [], requests: [] });
    }
    return user;
};

// --- ROUTES ---

// 1. VALIDATION ENDPOINT (Zjednodušená logika pro stackování)
app.post('/api/inventory/validate', async (req, res) => {
    try {
        const { items } = req.body; // Array of { id, title }
        if (!Array.isArray(items)) return res.status(400).json({ message: 'Invalid format' });

        const admin = await getOrCreateUser(ADMIN_EMAIL);
        // Získáme set všech ID, které admin vytvořil (Master Catalog)
        const masterIds = new Set(admin.inventory.map(i => i.id));

        // Pro speciální předměty (crafting) kontrolujeme i názvy
        const masterTitles = new Set(admin.inventory.map(i => i.title ? i.title.toLowerCase().trim() : ""));

        console.log(`[VALIDATION] Checking ${items.length} items. Logic: Base ID Existence.`);

        const validIds = items.filter(item => {
            // 1. Získáme "Základní ID" (např. z "ITEM-01__172399" uděláme "ITEM-01")
            const baseId = item.id.split('__')[0];

            // 2. Je toto základní ID v databázi admina?
            // Pokud ano, je to platná karta, nehledě na suffix nebo počet kopií.
            if (masterIds.has(baseId)) return true;

            // 3. Kontrola pro speciální/generované itemy, které nemají statické ID
            const isSpecial = baseId.startsWith('CRAFTED-') ||
                baseId.startsWith('RES-') ||
                baseId.startsWith('BOUGHT-') ||
                baseId.startsWith('LIVE-') ||
                baseId.startsWith('LANDING-') ||
                baseId.startsWith('PHASE-') || // <--- ADDED PHASE
                baseId.startsWith('GEN-');

            if (isSpecial) {
                // Pokud je to speciální item, stačí když známe jeho název (např. "Lékárnička")
                return item.title && masterTitles.has(item.title.toLowerCase().trim());
            }

            // Pokud ID neznáme vůbec, je to smetí
            console.warn(`[VALIDATION] Unknown Item Rejected: ${item.id}`);
            return false;
        }).map(i => i.id); // Vracíme zpět plná ID (i se suffixy), aby je klient nemazal

        res.json({ validIds });
    } catch (e) {
        console.error("Validation Error:", e);
        res.status(500).json({ message: e.message });
    }
});

app.get('/api/health', (req, res) => res.json({ status: 'secure_online', timestamp: Date.now() }));

// REMOVED: app.post('/api/auth/login', ...) - Password login is no longer supported

app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential, clientId } = req.body;
        if (!credential) return res.status(400).json({ message: 'Google Token required' });

        const targetClientId = SERVER_GOOGLE_CLIENT_ID || clientId;
        if (!targetClientId) return res.status(500).json({ message: 'Server config error' });

        const clientVerifier = SERVER_GOOGLE_CLIENT_ID && googleClient
            ? googleClient
            : new OAuth2Client(targetClientId);

        const ticket = await clientVerifier.verifyIdToken({
            idToken: credential,
            audience: targetClientId,
        });
        const payload = ticket.getPayload();
        const email = payload.email;

        if (!email) return res.status(400).json({ message: 'Invalid Google Token payload' });

        const normalizedEmail = email.toLowerCase().trim();

        if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
            console.warn(`⛔ Přístup zamítnut pro: ${normalizedEmail} (Není na whitelistu)`);
            return res.status(403).json({ message: 'Přístup odepřen. Váš email není na seznamu povolených testerů.' });
        }

        console.log(`✅ Google Login Success: ${normalizedEmail}`);

        const user = await getOrCreateUser(normalizedEmail);
        res.json({ email: user.email, isNewUser: user.inventory.length === 0 });

    } catch (e) {
        console.error("❌ Google Auth Error:", e.message);
        res.status(401).json({ message: `Google Auth Failed: ${e.message}` });
    }
});

// GENERIC INVENTORY ROUTES
// REMOVED: Hardcoded route for master admin - caused all inventory requests to return master admin data
app.get('/api/inventory/:email', async (req, res) => { try { const u = await getOrCreateUser(req.params.email); res.json(u.inventory); } catch (e) { res.status(500).json({ message: e.message }) } });

// GET INDIVIDUAL CARD ROUTE
app.get('/api/inventory/:email/:cardId', async (req, res) => {
    try {
        const u = await User.findOne({ email: req.params.email.toLowerCase() });
        if (!u) return res.status(404).json({ message: 'User not found' });
        const card = u.inventory.find(i => i.id === req.params.cardId);
        if (!card) return res.status(404).json({ message: 'Card not found' });
        res.json(card);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// SAVE / UPDATE ITEM ROUTE (Upraveno pro stacking)
app.post('/api/inventory/:email', async (req, res) => {
    try {
        const u = await getOrCreateUser(req.params.email);
        const newItem = req.body;

        // Zkusíme najít PŘESNOU shodu ID (včetně suffixu)
        const idx = u.inventory.findIndex(i => i.id === newItem.id);

        if (idx >= 0) {
            // Pokud přesné ID existuje, aktualizujeme ho (např. změna množství u suroviny)
            u.inventory[idx] = newItem;
        } else {
            // Pokud přesné ID neexistuje, PŘIDÁME HO jako novou položku.
            // Tím je umožněno mít v DB "ITEM-01__A" a "ITEM-01__B" vedle sebe.
            u.inventory.push(newItem);
        }

        await u.save();
        res.json(newItem);
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
});

app.delete('/api/inventory/:email/:cardId', async (req, res) => { try { const u = await User.findOne({ email: req.params.email.toLowerCase() }); if (u) { u.inventory = u.inventory.filter(i => i.id !== req.params.cardId); await u.save(); } res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }) } });

// --- TRADING & TRANSFER ROUTES ---

app.post('/api/inventory/transfer', async (req, res) => {
    try {
        const { fromEmail, toEmail, itemId } = req.body;
        console.log(`[TRANSFER] From: ${fromEmail}, To: ${toEmail}, Item: ${itemId}`);

        let itemToTransfer = null;

        // 1. Odebrání od odesílatele (pokud není host)
        if (fromEmail !== 'guest') {
            const sender = await getOrCreateUser(fromEmail);
            const itemIdx = sender.inventory.findIndex(i => i.id === itemId);
            if (itemIdx === -1) return res.status(404).json({ message: 'Předmět u odesílatele nenalezen.' });
            itemToTransfer = sender.inventory[itemIdx];
            sender.inventory.splice(itemIdx, 1);
            await sender.save();
        } else {
            // Pro hosta musíme item získat z Master Catalogu (nebo by ho měl poslat v body, ale transfer bere jen ID)
            // Předpokládáme, že item existuje v Masteru
            const admin = await getOrCreateUser(ADMIN_EMAIL);
            const baseId = itemId.split('__')[0];
            itemToTransfer = admin.inventory.find(i => i.id === baseId || i.id === itemId);
            if (!itemToTransfer) return res.status(404).json({ message: 'Předmět pro transfer nenalezen v katalogu.' });
        }

        // 2. Přidání příjemci (pokud není host)
        if (toEmail !== 'guest') {
            const receiver = await getOrCreateUser(toEmail);
            receiver.inventory.push(itemToTransfer);
            await receiver.save();
        }

        res.json({ success: true, item: itemToTransfer });
    } catch (e) {
        console.error("Transfer error:", e);
        res.status(500).json({ message: e.message });
    }
});

app.post('/api/inventory/swap', async (req, res) => {
    try {
        const { player1Email, player2Email, item1Id, item2Id } = req.body;
        console.log(`[SWAP] P1: ${player1Email} (${item1Id}) <-> P2: ${player2Email} (${item2Id})`);

        let item1 = null;
        let item2 = null;

        // 1. Získání a odebrání Item1
        if (player1Email !== 'guest') {
            const p1 = await getOrCreateUser(player1Email);
            const idx1 = p1.inventory.findIndex(i => i.id === item1Id);
            if (idx1 === -1) return res.status(404).json({ message: `Předmět ${item1Id} u hráče 1 nenalezen.` });
            item1 = p1.inventory[idx1];
            p1.inventory.splice(idx1, 1);
            await p1.save();
        } else {
            // Host - simulujeme získání z Masteru pro potřeby druhého hráče
            const admin = await getOrCreateUser(ADMIN_EMAIL);
            item1 = admin.inventory.find(i => i.id === item1Id.split('__')[0] || i.id === item1Id);
        }

        // 2. Získání a odebrání Item2
        if (player2Email !== 'guest') {
            const p2 = await getOrCreateUser(player2Email);
            const idx2 = p2.inventory.findIndex(i => i.id === item2Id);
            if (idx2 === -1) {
                // Rollback P1 if needed? For simplicity we assume valid IDs
                return res.status(404).json({ message: `Předmět ${item2Id} u hráče 2 nenalezen.` });
            }
            item2 = p2.inventory[idx2];
            p2.inventory.splice(idx2, 1);
            await p2.save();
        } else {
            const admin = await getOrCreateUser(ADMIN_EMAIL);
            item2 = admin.inventory.find(i => i.id === item2Id.split('__')[0] || i.id === item2Id);
        }

        // 3. Křížové přidání
        if (player1Email !== 'guest') {
            const p1 = await getOrCreateUser(player1Email);
            p1.inventory.push(item2);
            await p1.save();
        }
        if (player2Email !== 'guest') {
            const p2 = await getOrCreateUser(player2Email);
            p2.inventory.push(item1);
            await p2.save();
        }

        res.json({ success: true, item1, item2 });
    } catch (e) {
        console.error("Swap error:", e);
        res.status(500).json({ message: e.message });
    }
});

// --- ADMIN PURGE FEATURE (OPRAVENO PRO GOOGLE AUTH) ---
app.delete('/api/admin/purge/:cardId', async (req, res) => {
    try {
        const adminKey = req.headers['x-admin-key'];
        const userEmail = req.headers['x-user-email']; // Nová hlavička z frontendu

        // Povolíme, pokud se shoduje admin heslo NEBO pokud je email uživatele adminův email (Google Login)
        const isAuthorized = (adminKey === ADMIN_PASSWORD) || (userEmail === ADMIN_EMAIL);

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Unauthorized: Admin access required.' });
        }

        const { cardId } = req.params;
        if (!cardId) return res.status(400).json({ message: 'Missing cardId' });

        const result = await User.updateMany(
            {},
            { $pull: { inventory: { id: cardId } } }
        );

        console.log(`⚠️ GLOBAL PURGE: Item ${cardId} removed from ${result.modifiedCount} users by ${userEmail || 'KEY'}.`);
        res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (e) {
        console.error("Purge Error:", e);
        res.status(500).json({ message: e.message });
    }
});

// Rooms
app.post('/api/rooms', async (req, res) => {
    try {
        const { roomId, hostName, hostEmail, password } = req.body;
        await Room.deleteOne({ roomId });
        await Room.create({
            roomId,
            host: hostName,
            password,
            members: [{ name: hostName, email: hostEmail || ADMIN_EMAIL, hp: 100, isReady: false, lastSeen: Date.now() }],
            messages: []
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }) }
});
app.post('/api/rooms/:roomId/join', async (req, res) => {
    try {
        const r = await Room.findOne({ roomId: req.params.roomId });
        if (!r) return res.status(404).json({ message: "Sektor nenalezen" });
        const existing = r.members.find(m => m.name === req.body.userName);
        if (existing) {
            existing.lastSeen = Date.now();
            if (req.body.email) existing.email = req.body.email;
        } else {
            r.members.push({ name: req.body.userName, email: req.body.email, hp: 100, lastSeen: Date.now(), isReady: false });
        }
        await r.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }) }
});
app.get('/api/rooms/:roomId/status', async (req, res) => {
    try {
        const r = await Room.findOne({ roomId: req.params.roomId });
        if (!r) return res.status(404).json({ message: "Sektor nenalezen" });
        res.json(r);
    } catch (e) { res.status(500).json({ message: e.message }) }
});
app.post('/api/rooms/:roomId/status', async (req, res) => { try { await Room.updateOne({ roomId: req.params.roomId, "members.name": req.body.userName }, { $set: { "members.$.hp": req.body.hp } }); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }) } });
app.post('/api/rooms/:roomId/messages', async (req, res) => { try { const r = await Room.findOne({ roomId: req.params.roomId }); if (r) { r.messages.push({ id: Date.now().toString(), ...req.body }); await r.save(); } res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }) } });
app.get('/api/rooms/:roomId/messages', async (req, res) => { try { const r = await Room.findOne({ roomId: req.params.roomId }); res.json(r ? r.messages : []); } catch (e) { res.status(500).json({ message: e.message }) } });

// NEW: Ready Check Endpoint
app.post('/api/rooms/:roomId/ready', async (req, res) => {
    try {
        const { userName, isReady } = req.body;
        const r = await Room.findOne({ roomId: req.params.roomId });
        if (r) {
            const member = r.members.find(m => m.name === userName);
            if (member) member.isReady = isReady;
            await r.save();
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }) }
});

// NEW: Game Lifecycle Endpoints
app.post('/api/rooms/:roomId/start-game', async (req, res) => {
    try {
        const r = await Room.findOne({ roomId: req.params.roomId });
        if (r) {
            r.isGameStarted = true;
            r.roundNumber = 1;
            r.turnIndex = 0;
            // Shufflování pořadí hráčů
            r.turnOrder = r.members.map(m => m.name).sort(() => Math.random() - 0.5);
            r.messages.push({
                id: 'sys-' + Date.now(),
                sender: 'SYSTEM',
                text: '🚀 MISE ZAHÁJENA! Sektor byl uzamčen.',
                timestamp: Date.now(),
                isSystem: true
            });
            await r.save();
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }) }
});

app.post('/api/rooms/:roomId/next-turn', async (req, res) => {
    try {
        const r = await Room.findOne({ roomId: req.params.roomId });
        if (r && r.isGameStarted) {
            r.turnIndex++;
            if (r.turnIndex >= r.turnOrder.length) {
                // Konec kola
                r.turnIndex = 0;
                r.roundNumber++;
                r.readyForNextRound = []; // Reset ready flagů pro další kolo
                r.messages.push({
                    id: 'sys-' + Date.now(),
                    sender: 'SYSTEM',
                    text: `⌛ CYKLUS ${r.roundNumber - 1} SKONČIL. Vstup do cyklu ${r.roundNumber}.`,
                    timestamp: Date.now(),
                    isSystem: true
                });
            }
            await r.save();
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }) }
});

app.post('/api/rooms/:roomId/acknowledge-round', async (req, res) => {
    try {
        const { userName } = req.body;
        const r = await Room.findOne({ roomId: req.params.roomId });
        if (r) {
            if (!r.readyForNextRound.includes(userName)) {
                r.readyForNextRound.push(userName);
            }
            await r.save();
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }) }
});

app.post('/api/rooms/:roomId/leave', async (req, res) => {
    try {
        const { userName } = req.body;
        const r = await Room.findOne({ roomId: req.params.roomId });
        if (r) {
            r.members = r.members.filter(m => m.name !== userName);
            if (r.members.length === 0) {
                await Room.deleteOne({ roomId: req.params.roomId });
            } else {
                if (r.host === userName) r.host = r.members[0].name; // Pass host
                await r.save();
            }
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }) }
});
app.post('/api/rooms/:roomId/encounter', async (req, res) => {
    try {
        const { encounter } = req.body; // GameEvent or null
        const r = await Room.findOne({ roomId: req.params.roomId });
        if (r) {
            r.activeEncounter = encounter;
            await r.save();
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }) }
});

// Admin
app.post('/api/admin/action', async (req, res) => {
    try {
        const { roomId, targetName, actionType, value } = req.body;
        const r = await Room.findOne({ roomId });
        if (!r) return res.status(404).json({ message: 'Sektor nenalezen' });

        let msg = '';
        if (actionType === 'broadcast') msg = `📢 SYSTEM: ${value}`;
        else if (actionType === 'damage') { const m = r.members.find(m => m.name === targetName); if (m) m.hp = Math.max(0, m.hp + value); msg = `⚠️ ADMIN: ${targetName} -${Math.abs(value)} HP`; }
        else if (actionType === 'heal') { const m = r.members.find(m => m.name === targetName); if (m) m.hp = Math.min(100, m.hp + value); msg = `✨ ADMIN: ${targetName} +${value} HP`; }
        else if (actionType === 'kick') { r.members = r.members.filter(m => m.name !== targetName); msg = `🚫 ADMIN: ${targetName} vyhozen.`; }

        if (msg) r.messages.push({ id: 'adm-' + Date.now(), sender: 'SYSTEM', text: msg, timestamp: Date.now(), isSystem: true });
        await r.save(); res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.listen(PORT, () => { console.log(`✅ Nexus Backend running on port ${PORT}`); });
