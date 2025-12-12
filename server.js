
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'nexus_db.json');
const ADMIN_EMAIL = 'zbynekbal97@gmail.com';

// --- SEED DATA ---
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
    if (!db.users[ADMIN_EMAIL]) {
        db.users[ADMIN_EMAIL] = { 
            email: ADMIN_EMAIL, 
            nickname: 'Master Admin', 
            inventory: [], 
            friends: [], 
            requests: [] 
        };
    }

    const adminInv = db.users[ADMIN_EMAIL].inventory || [];
    let addedCount = 0;
    
    ADMIN_SEED_ITEMS.forEach(seedItem => {
        const existingIndex = adminInv.findIndex(i => i.id === seedItem.id);
        if (existingIndex === -1) {
            adminInv.push(seedItem);
            addedCount++;
        } else {
            adminInv[existingIndex] = seedItem;
        }
    });
    
    db.users[ADMIN_EMAIL].inventory = adminInv;
    saveDb();
};

const saveDb = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error("Failed to save DB:", e);
    }
};

loadDb();

// Helper: Get or Create User
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
    console.log("------------------------------------------");
    console.log("[TRANSFER] Start Transaction");
    
    const { fromEmail, toEmail, cardId } = req.body;

    if (!fromEmail || !toEmail || !cardId) {
        console.log("[TRANSFER] ERROR: Missing parameters", req.body);
        return res.status(400).json({ message: 'Missing parameters' });
    }
    
    // 1. Normalize Keys
    const senderKey = fromEmail.toLowerCase().trim();
    const receiverKey = toEmail.toLowerCase().trim();
    const cardIdStr = cardId.toString().trim(); // Ensure string matching

    console.log(`[TRANSFER] From: ${senderKey} | To: ${receiverKey} | Item: ${cardIdStr}`);
    
    // 2. Load Users
    const sender = getUser(senderKey);
    const receiver = getUser(receiverKey); // Creates receiver if they don't exist yet in DB
    
    if (!sender) {
        console.log("[TRANSFER] ERROR: Sender not found in DB");
        return res.status(404).json({ message: 'Sender not found' });
    }

    // 3. Find Item (Case-Insensitive ID Check)
    const itemIndex = sender.inventory.findIndex(i => 
        i.id.toLowerCase() === cardIdStr.toLowerCase()
    );

    if (itemIndex === -1) {
        console.log("[TRANSFER] ERROR: Item NOT found in sender inventory.");
        console.log("[TRANSFER] Sender Inventory IDs:", sender.inventory.map(i => i.id));
        return res.status(404).json({ message: 'Item not found in sender inventory' });
    }
    
    // 4. Check Permission (Optional but good)
    const itemToTransfer = sender.inventory[itemIndex];
    if (itemToTransfer.isShareable === false) {
        console.log("[TRANSFER] WARNING: Item is marked as NOT shareable. Transferring anyway due to admin/game logic override, or blocking?");
        // Uncomment below to strictly block non-shareables:
        // return res.status(403).json({ message: 'Item is not shareable' });
    }

    // 5. Execute Transfer (Deep Copy)
    const transferPayload = JSON.parse(JSON.stringify(itemToTransfer));
    
    // Remove from sender
    sender.inventory.splice(itemIndex, 1);
    
    // Add to receiver
    receiver.inventory.push(transferPayload);
    
    console.log(`[TRANSFER] Success! Item moved. Saving DB...`);
    
    // 6. FORCE SAVE
    saveDb(); 
    
    console.log("[TRANSFER] DB Saved. Response sent.");
    console.log("------------------------------------------");
    res.json({ success: true });
});

// --- ROUTES: ROOMS ---

app.post('/api/rooms', (req, res) => {
    const { roomId, hostName, hostEmail } = req.body; 
    if (!db.rooms[roomId]) {
        db.rooms[roomId] = {
            id: roomId,
            host: hostName,
            members: [{ 
                name: hostName, 
                email: hostEmail ? hostEmail.toLowerCase().trim() : undefined, 
                hp: 100, 
                lastSeen: Date.now() 
            }], 
            messages: []
        };
        saveDb();
    }
    res.json({ success: true, roomId });
});

// FIXED: Ensure email is updated when joining/rejoining
app.post('/api/rooms/:roomId/join', (req, res) => {
    const { roomId } = req.params;
    const { userName, hp, email } = req.body;
    
    const room = db.rooms[roomId];
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;

    const existingMember = room.members.find(m => m.name === userName);
    if (!existingMember) {
        room.members.push({ name: userName, email: normalizedEmail, hp: hp || 100, lastSeen: Date.now() });
        room.messages.push({
            id: 'sys-' + Date.now(),
            sender: 'SYSTEM',
            text: `${userName} se připojil/a.`,
            timestamp: Date.now(),
            isSystem: true
        });
    } else {
        // Update existing member info, especially EMAIL if it was missing
        existingMember.lastSeen = Date.now();
        if (hp !== undefined) existingMember.hp = hp;
        if (normalizedEmail) existingMember.email = normalizedEmail; 
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

