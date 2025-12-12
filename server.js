
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'nexus_db.json');
const ADMIN_EMAIL = 'zbynekbal97@gmail.com';

// --- SEED DATA (Karty, které se vždy obnoví po smazání databáze nebo restartu serveru) ---
const ADMIN_SEED_ITEMS = [
    {
        id: "ITEM-001",
        title: "Lékárnička",
        description: "Základní zdravotnický balíček. Obnoví malé množství zdraví.",
        type: "PŘEDMĚT",
        rarity: "Common",
        isShareable: true,
        stats: [{ label: "HP", value: "+20" }],
        price: 50
    },
    {
        id: "ITEM-002",
        title: "Adrenalinová Injekce",
        description: "Okamžité oživení, ale s vedlejšími účinky.",
        type: "PŘEDMĚT",
        rarity: "Rare",
        isShareable: true,
        stats: [{ label: "HP", value: "+50" }, { label: "STAMINA", value: "+10" }],
        price: 150
    },
    {
        id: "WEAPON-01",
        title: "Plazmová Puška",
        description: "Standardní zbraň pěchoty. Účinná proti lehkému pancíři.",
        type: "PŘEDMĚT",
        rarity: "Rare",
        isShareable: true,
        stats: [{ label: "DMG", value: "15" }],
        price: 120
    },
    {
        id: "WEAPON-02",
        title: "Energetická Čepel",
        description: "Tichá a smrtící zbraň na blízko.",
        type: "PŘEDMĚT",
        rarity: "Epic",
        isShareable: true,
        stats: [{ label: "DMG", value: "25" }, { label: "CRIT", value: "10%" }],
        price: 300
    },
    {
        id: "SHOP-001",
        title: "Překupník se Zbraněmi",
        description: "Tento obchodník nabízí nelegální zbraně a munici.",
        type: "OBCHODNÍK",
        rarity: "Epic",
        isShareable: false,
        merchantItems: [
            { id: "ITEM-001", stock: 10 },
            { id: "WEAPON-01", stock: 5 },
            { id: "WEAPON-02", stock: 2 }
        ]
    }
];

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- DATABASE HANDLERS ---

let db = {
    users: {},
    rooms: {},
    codes: {}
};

// Load DB from file
const loadDb = () => {
    if (fs.existsSync(DB_FILE)) {
        try {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            db = JSON.parse(data);
            console.log("Database loaded from file.");
        } catch (e) {
            console.error("Error loading DB, starting fresh.", e);
        }
    } else {
        console.log("No DB file found, starting fresh.");
    }

    // --- ADMIN SEED CHECK ---
    // Ensure Admin exists and has seed items if empty or corrupted
    if (!db.users[ADMIN_EMAIL]) {
        db.users[ADMIN_EMAIL] = { 
            email: ADMIN_EMAIL, 
            nickname: 'Master Admin', 
            inventory: [], 
            friends: [], 
            requests: [] 
        };
    }

    // Merge Seed Items into Admin Inventory (prevent duplicates based on ID)
    const adminInv = db.users[ADMIN_EMAIL].inventory || [];
    let addedCount = 0;
    
    ADMIN_SEED_ITEMS.forEach(seedItem => {
        const existingIndex = adminInv.findIndex(i => i.id === seedItem.id);
        if (existingIndex === -1) {
            // New item, add it
            adminInv.push(seedItem);
            addedCount++;
        } else {
            // Existing item, UPDATE it (so edits in code reflect in DB after restart)
            adminInv[existingIndex] = seedItem;
        }
    });
    
    db.users[ADMIN_EMAIL].inventory = adminInv; // Re-assign ensuring safety
    
    if (addedCount > 0) {
        console.log(`Seeded ${addedCount} new items to Admin inventory.`);
    }
    saveDb();
};

// Save DB to file
const saveDb = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error("Failed to save DB:", e);
    }
};

// Initialize DB
loadDb();

// Helper: Get or Create User (Normalized Email)
const getUser = (rawEmail) => {
    if (!rawEmail) return null;
    const email = rawEmail.toLowerCase().trim();
    
    if (!db.users[email]) {
        db.users[email] = { 
            email, 
            nickname: email.split('@')[0], 
            inventory: [], 
            friends: [], 
            requests: [] 
        };
        saveDb();
    }
    return db.users[email];
};

// --- ROUTES: AUTH & USER ---

app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    
    const user = getUser(email);
    console.log(`User logged in: ${user.email}`);
    res.json({ email: user.email, isNewUser: false });
});

app.get('/api/users/:email/nickname', (req, res) => {
    const user = getUser(req.params.email);
    res.json({ nickname: user.nickname });
});

app.post('/api/users/:email/nickname', (req, res) => {
    const { nickname } = req.body;
    const user = getUser(req.params.email);
    user.nickname = nickname;
    saveDb();
    res.json({ success: true, nickname });
});

// --- ROUTES: INVENTORY ---

app.get('/api/inventory/:email', (req, res) => {
    const user = getUser(req.params.email);
    res.json(user.inventory);
});

app.get('/api/inventory/:email/:cardId', (req, res) => {
    const user = getUser(req.params.email);
    const item = user.inventory.find(i => i.id === req.params.cardId);
    if (item) res.json(item);
    else res.status(404).json({ message: 'Item not found' });
});

app.post('/api/inventory/:email', (req, res) => {
    const user = getUser(req.params.email);
    const newItem = req.body;
    // Check if item exists to avoid duplicates or to update
    const existingIndex = user.inventory.findIndex(i => i.id === newItem.id);
    if (existingIndex >= 0) {
        user.inventory[existingIndex] = newItem; 
    } else {
        user.inventory.push(newItem); 
    }
    saveDb();
    res.json(newItem);
});

app.put('/api/inventory/:email/:cardId', (req, res) => {
    const user = getUser(req.params.email);
    const index = user.inventory.findIndex(i => i.id === req.params.cardId);
    if (index !== -1) {
        user.inventory[index] = { ...user.inventory[index], ...req.body };
        saveDb();
        res.json(user.inventory[index]);
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});

app.delete('/api/inventory/:email/:cardId', (req, res) => {
    const user = getUser(req.params.email);
    user.inventory = user.inventory.filter(i => i.id !== req.params.cardId);
    saveDb();
    res.json({ success: true });
});

// --- ROUTES: FRIENDS & TRANSFER ---

app.get('/api/users/:email/friends', (req, res) => {
    const user = getUser(req.params.email);
    res.json({ friends: user.friends });
});

app.get('/api/users/:email/friends/requests', (req, res) => {
    const user = getUser(req.params.email);
    res.json(user.requests);
});

app.post('/api/users/:email/friends/request', (req, res) => {
    const senderEmail = req.params.email.toLowerCase().trim();
    const targetEmail = req.body.targetEmail ? req.body.targetEmail.toLowerCase().trim() : null;
    if (!targetEmail || senderEmail === targetEmail) return res.status(400).json({ message: 'Invalid target email' });
    const targetUser = getUser(targetEmail); 
    if (targetUser.friends.includes(senderEmail)) return res.json({ message: 'Already friends' });
    if (targetUser.requests.some(r => r.fromEmail === senderEmail)) return res.json({ message: 'Request already sent' });
    targetUser.requests.push({ fromEmail: senderEmail, timestamp: Date.now() });
    saveDb();
    res.json({ success: true });
});

app.post('/api/users/:email/friends/respond', (req, res) => {
    const userEmail = req.params.email.toLowerCase().trim();
    const targetEmail = req.body.targetEmail ? req.body.targetEmail.toLowerCase().trim() : null;
    const { accept } = req.body;
    const user = getUser(userEmail);
    user.requests = user.requests.filter(r => r.fromEmail !== targetEmail);
    if (accept && targetEmail) {
        const targetUser = getUser(targetEmail);
        if (!user.friends.includes(targetEmail)) user.friends.push(targetEmail);
        if (!targetUser.friends.includes(userEmail)) targetUser.friends.push(userEmail);
    }
    saveDb();
    res.json({ success: true });
});

// --- CRITICAL FIX: ROBUST TRANSFER LOGIC ---
app.post('/api/inventory/transfer', (req, res) => {
    const { fromEmail, toEmail, cardId } = req.body;
    
    console.log(`[TRANSFER] Request: ${fromEmail} -> ${toEmail} [${cardId}]`);

    if (!fromEmail || !toEmail || !cardId) {
        return res.status(400).json({ message: 'Missing parameters' });
    }
    
    // Normalize emails strictly to ensure we find the right DB entries
    const senderKey = fromEmail.toLowerCase().trim();
    const receiverKey = toEmail.toLowerCase().trim();
    
    const sender = db.users[senderKey];
    const receiver = db.users[receiverKey];
    
    if (!sender) return res.status(404).json({ message: 'Sender not found in DB' });
    if (!receiver) {
        // If receiver is in the room but not in DB yet (rare, but possible if they just joined via Room ID)
        // We create them.
        console.log(`[TRANSFER] Receiver ${receiverKey} not found, creating...`);
        getUser(receiverKey); // This creates the user in db.users
    }
    
    // Refresh reference after potential creation
    const validReceiver = db.users[receiverKey];

    const itemIndex = sender.inventory.findIndex(i => i.id === cardId);
    if (itemIndex === -1) {
        console.error(`[TRANSFER] Item ${cardId} NOT FOUND in sender inventory.`);
        return res.status(404).json({ message: 'Item not found in sender inventory' });
    }
    
    // 1. Get the item (Deep copy)
    const itemToTransfer = JSON.parse(JSON.stringify(sender.inventory[itemIndex]));
    
    // 2. Remove from sender (Modify array in place)
    sender.inventory.splice(itemIndex, 1);
    
    // 3. Add to receiver
    validReceiver.inventory.push(itemToTransfer);
    
    console.log(`[TRANSFER] Success. Saving DB...`);
    
    // 4. FORCE SAVE IMMEDIATELY
    saveDb(); 
    
    res.json({ success: true });
});

// --- ROUTES: ROOMS / CHAT (UPDATED FOR DIRECT TRADE) ---

app.post('/api/rooms', (req, res) => {
    const { roomId, hostName, hostEmail } = req.body; 
    if (!db.rooms[roomId]) {
        db.rooms[roomId] = {
            id: roomId,
            host: hostName,
            members: [{ name: hostName, email: hostEmail, hp: 100, lastSeen: Date.now() }], 
            messages: []
        };
        saveDb();
    }
    res.json({ success: true, roomId });
});

app.post('/api/rooms/:roomId/join', (req, res) => {
    const { roomId } = req.params;
    const { userName, hp, email } = req.body;
    
    const room = db.rooms[roomId];
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const existingMember = room.members.find(m => m.name === userName);
    if (!existingMember) {
        room.members.push({ name: userName, email: email, hp: hp || 100, lastSeen: Date.now() });
        room.messages.push({
            id: 'sys-' + Date.now(),
            sender: 'SYSTEM',
            text: `${userName} se připojil/a.`,
            timestamp: Date.now(),
            isSystem: true
        });
    } else {
        existingMember.lastSeen = Date.now();
        if (hp !== undefined) existingMember.hp = hp;
        if (email) existingMember.email = email;
    }
    saveDb();
    res.json({ success: true });
});

app.post('/api/rooms/:roomId/status', (req, res) => {
    const { roomId } = req.params;
    const { userName, hp } = req.body;
    const room = db.rooms[roomId];
    if (room) {
        const member = room.members.find(m => m.name === userName);
        if (member) {
            member.hp = hp;
            member.lastSeen = Date.now();
        }
        res.json({ success: true });
    } else {
        res.status(404).json({ message: 'Room not found' });
    }
});

app.get('/api/rooms/:roomId/members', (req, res) => {
    const room = db.rooms[req.params.roomId];
    if (!room) return res.json([]);
    res.json(room.members);
});

app.post('/api/rooms/:roomId/leave', (req, res) => {
    const { roomId } = req.params;
    const { userName } = req.body;
    const room = db.rooms[roomId];
    if (room) {
        room.members = room.members.filter(u => u.name !== userName);
        room.messages.push({
            id: 'sys-' + Date.now(),
            sender: 'SYSTEM',
            text: `${userName} odešel/a.`,
            timestamp: Date.now(),
            isSystem: true
        });
        if (room.members.length === 0) delete db.rooms[roomId];
        saveDb();
    }
    res.json({ success: true });
});

app.get('/api/rooms/:roomId/messages', (req, res) => {
    const room = db.rooms[req.params.roomId];
    if (!room) return res.json([]);
    res.json(room.messages);
});

app.post('/api/rooms/:roomId/messages', (req, res) => {
    const { roomId } = req.params;
    const { sender, text } = req.body;
    const room = db.rooms[roomId];
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const msg = { id: Date.now().toString(), sender, text, timestamp: Date.now() };
    room.messages.push(msg);
    if (room.messages.length > 50) room.messages.shift();
    saveDb();
    res.json(msg);
});

app.post('/api/gemini/interpret-code', (req, res) => {
    res.json({
        id: req.body.code,
        title: "Mystery Item",
        description: "An item generated by backend mock.",
        type: "PŘEDMĚT",
        rarity: "Common",
        stats: []
    });
});

app.listen(PORT, () => {
    console.log(`Nexus Backend running on port ${PORT}`);
});

