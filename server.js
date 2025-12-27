
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

const CharacterSchema = new mongoose.Schema({
    characterId: { type: String, required: true, unique: true, uppercase: true },
    adminEmail: { type: String, required: true, lowercase: true },
    name: { type: String, required: true },
    description: String,
    imageUrl: String,
    baseStats: {
        hp: { type: Number, default: 100 },
        mana: { type: Number, default: 100 },
        armor: { type: Number, default: 0 },
        damage: { type: Number, default: 10 },
        critChance: { type: Number, default: 5 },
        speed: { type: Number, default: 50 }
    },
    perks: [{
        name: String,
        description: String,
        effect: {
            stat: String,
            modifier: Number,
            isPercentage: Boolean,
            condition: String
        }
    }],
    timeVariant: {
        enabled: { type: Boolean, default: false },
        nightModifiers: {
            statChanges: [{
                stat: String,
                modifier: Number,
                isPercentage: Boolean
            }],
            additionalPerks: [Object]
        }
    }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Room = mongoose.model('Room', RoomSchema);
const Character = mongoose.model('Character', CharacterSchema);

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
        console.log(`[SWAP] Request: ${player1Email} (${item1Id}) <-> ${player2Email} (${item2Id})`);

        if (!player1Email || !player2Email || !item1Id || !item2Id) {
            return res.status(400).json({ message: "Invalid swap parameters." });
        }

        const p1 = await getOrCreateUser(player1Email);
        const p2 = await getOrCreateUser(player2Email);

        if (!p1 || !p2) return res.status(404).json({ message: "Users not found." });

        if (!p1.inventory) p1.inventory = [];
        if (!p2.inventory) p2.inventory = [];

        const idx1 = p1.inventory.findIndex(i => i.id === item1Id);
        const idx2 = p2.inventory.findIndex(i => i.id === item2Id);

        if (idx1 === -1) return res.status(404).json({ message: `Item ${item1Id} missing from P1.` });
        if (idx2 === -1) return res.status(404).json({ message: `Item ${item2Id} missing from P2.` });

        // Use toObject() to detach from Mongoose document array and avoid reference issues
        const item1 = p1.inventory[idx1].toObject ? p1.inventory[idx1].toObject() : { ...p1.inventory[idx1] };
        const item2 = p2.inventory[idx2].toObject ? p2.inventory[idx2].toObject() : { ...p2.inventory[idx2] };

        // Ensure we are swapping correct items
        console.log(`[SWAP] Executing: ${item1.title} <-> ${item2.title}`);

        // Remove from inventories
        p1.inventory.splice(idx1, 1);
        p2.inventory.splice(idx2, 1);

        // Add to inventories (cross-over)
        p1.inventory.push(item2);
        p2.inventory.push(item1);

        // Mark modified just in case Mongoose doesn't detect array changes
        p1.markModified('inventory');
        p2.markModified('inventory');

        await p1.save();
        await p2.save();

        console.log(`✅ [SWAP] Success. P1 Items: ${p1.inventory.length}, P2 Items: ${p2.inventory.length}`);
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

// --- CHARACTER ROUTES ---

// Get all characters for admin
app.get('/api/characters/:adminEmail', async (req, res) => {
    try {
        const adminEmail = req.params.adminEmail.toLowerCase();
        const characters = await Character.find({ adminEmail }).sort({ createdAt: -1 });
        res.json(characters);
    } catch (e) {
        console.error("Get characters error:", e);
        res.status(500).json({ message: e.message });
    }
});

// Get character by ID (for scanning/selection)
app.get('/api/characters/by-id/:characterId', async (req, res) => {
    try {
        const characterId = req.params.characterId.toUpperCase();
        const character = await Character.findOne({ characterId });
        if (!character) return res.status(404).json({ message: 'Character not found' });
        res.json(character);
    } catch (e) {
        console.error("Get character by ID error:", e);
        res.status(500).json({ message: e.message });
    }
});

// Create or update character
app.post('/api/characters/:adminEmail', async (req, res) => {
    try {
        const adminEmail = req.params.adminEmail.toLowerCase();
        const characterData = req.body;

        // Generate ID if not provided
        if (!characterData.characterId) {
            const count = await Character.countDocuments({ adminEmail });
            characterData.characterId = `CHAR-${String(count + 1).padStart(3, '0')}`;
        }

        characterData.characterId = characterData.characterId.toUpperCase();
        characterData.adminEmail = adminEmail;

        // Try to find existing character
        const existing = await Character.findOne({ characterId: characterData.characterId });

        if (existing) {
            // Update existing
            Object.assign(existing, characterData);
            await existing.save();
            console.log(`✏️ Character updated: ${characterData.characterId} by ${adminEmail}`);
            res.json(existing);
        } else {
            // Create new
            const newChar = await Character.create(characterData);
            console.log(`✨ Character created: ${characterData.characterId} by ${adminEmail}`);
            res.json(newChar);
        }
    } catch (e) {
        console.error("Save character error:", e);
        res.status(500).json({ message: e.message });
    }
});

// Delete character
app.delete('/api/characters/:adminEmail/:characterId', async (req, res) => {
    try {
        const adminEmail = req.params.adminEmail.toLowerCase();
        const characterId = req.params.characterId.toUpperCase();

        const result = await Character.deleteOne({ characterId, adminEmail });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Character not found or unauthorized' });
        }

        console.log(`🗑️ Character deleted: ${characterId} by ${adminEmail}`);
        res.json({ success: true });
    } catch (e) {
        console.error("Delete character error:", e);
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

const removePlayerFromRoom = (room, userName) => {
    // 1. Remove from members
    const initialMemberCount = room.members.length;
    room.members = room.members.filter(m => m.name !== userName);
    const wasRemoved = room.members.length < initialMemberCount;

    if (!wasRemoved) return false;

    // 2. Remove from ready checks
    room.readyForNextRound = room.readyForNextRound.filter(name => name !== userName);

    // 3. Handle turn order and turn index if game started
    if (room.isGameStarted && room.turnOrder && room.turnOrder.length > 0) {
        const actingPlayer = room.turnOrder[room.turnIndex];
        const isRemovingActivePlayer = actingPlayer === userName;

        // Remove from turn order
        room.turnOrder = room.turnOrder.filter(name => name !== userName);

        if (room.turnOrder.length === 0) {
            room.isGameStarted = false;
            room.turnIndex = 0;
        } else if (isRemovingActivePlayer) {
            // If we removed the player who was on turn, the next player (at the same index) is now active
            // We just need to ensure index doesn't overshoot
            if (room.turnIndex >= room.turnOrder.length) {
                room.turnIndex = 0;
            }
        } else {
            // If we removed someone else, we might need to adjust index if they were BEFORE the current active player
            // But if we just find the new index of the guy who WAS acting, it's safer
            const newIndex = room.turnOrder.indexOf(actingPlayer);
            if (newIndex !== -1) {
                room.turnIndex = newIndex;
            } else {
                // Should not happen if actingPlayer wasn't the removed one
                if (room.turnIndex >= room.turnOrder.length) room.turnIndex = 0;
            }
        }
    }

    // 4. Pass host if needed
    if (room.host === userName && room.members.length > 0) {
        room.host = room.members[0].name;
    }

    return true;
};

app.post('/api/rooms/:roomId/leave', async (req, res) => {
    try {
        const { userName } = req.body;
        const r = await Room.findOne({ roomId: req.params.roomId });
        if (r) {
            const removed = removePlayerFromRoom(r, userName);
            if (r.members.length === 0) {
                await Room.deleteOne({ roomId: req.params.roomId });
            } else {
                if (removed) {
                    r.messages.push({
                        id: 'sys-' + Date.now(),
                        sender: 'SYSTEM',
                        text: `🚪 ${userName} opustil sektor.`,
                        timestamp: Date.now(),
                        isSystem: true
                    });
                    await r.save();
                }
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
        else if (actionType === 'kick') {
            const removed = removePlayerFromRoom(r, targetName);
            if (removed) msg = `🚫 ADMIN: ${targetName} byl vyhozen ze sektoru.`;
        }

        if (msg) r.messages.push({ id: 'adm-' + Date.now(), sender: 'SYSTEM', text: msg, timestamp: Date.now(), isSystem: true });
        await r.save(); res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.listen(PORT, () => { console.log(`✅ Nexus Backend running on port ${PORT}`); });
