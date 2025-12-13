
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Increased limit for bulk sync

// --- IN-MEMORY DATABASE (Simulace databáze) ---
const db = {
    users: {},     // { email: { nickname, inventory: [], friends: [], requests: [] } }
    rooms: {},     // { roomId: { host, members: [{ name, hp, lastSeen }], messages: [] } }
    codes: {}      
};

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
    }
    return db.users[email];
};

// --- SYSTEM ROUTES ---

// NEW: Health Check (Heartbeat)
// Lightweight endpoint to check if server is running
app.get('/api/health', (req, res) => {
    res.json({ status: 'online', timestamp: Date.now() });
});

// --- ROUTES: AUTH & USER ---

app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    
    const user = getUser(email);
    console.log(`User logged in: ${user.email}`);
    // Return whether the user was just created (meaning server might have been reset)
    // We check if inventory is empty as a heuristic for a "fresh/wiped" user
    res.json({ email: user.email, isNewUser: user.inventory.length === 0 });
});

app.get('/api/users/:email/nickname', (req, res) => {
    const user = getUser(req.params.email);
    res.json({ nickname: user.nickname });
});

app.post('/api/users/:email/nickname', (req, res) => {
    const { nickname } = req.body;
    const user = getUser(req.params.email);
    user.nickname = nickname;
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
    res.json(newItem);
});

// NEW: BULK RESTORE ENDPOINT
// Used to re-upload local backup to server after a reset
app.post('/api/inventory/:email/restore', (req, res) => {
    const user = getUser(req.params.email);
    const { items } = req.body; // Expects array of items
    
    if (!Array.isArray(items)) {
        return res.status(400).json({ message: 'Invalid data format' });
    }

    // Merge strategy: Overwrite server data with local backup
    // Or we could merge, but for restoration, local is usually truth
    user.inventory = items;
    
    console.log(`Restored ${items.length} items for ${user.email}`);
    res.json({ success: true, count: items.length });
});

app.put('/api/inventory/:email/:cardId', (req, res) => {
    const user = getUser(req.params.email);
    const index = user.inventory.findIndex(i => i.id === req.params.cardId);
    if (index !== -1) {
        user.inventory[index] = { ...user.inventory[index], ...req.body };
        res.json(user.inventory[index]);
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});

app.delete('/api/inventory/:email/:cardId', (req, res) => {
    const user = getUser(req.params.email);
    user.inventory = user.inventory.filter(i => i.id !== req.params.cardId);
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
    
    // STRICT SELF-CHECK
    if (!targetEmail || senderEmail === targetEmail) {
        return res.status(400).json({ message: 'Nemůžete si přidat sami sebe.' });
    }

    const targetUser = getUser(targetEmail); 
    if (targetUser.friends.includes(senderEmail)) return res.json({ message: 'Already friends' });
    if (targetUser.requests.some(r => r.fromEmail === senderEmail)) return res.json({ message: 'Request already sent' });
    
    targetUser.requests.push({ fromEmail: senderEmail, timestamp: Date.now() });
    res.json({ success: true });
});

app.post('/api/users/:email/friends/respond', (req, res) => {
    const userEmail = req.params.email.toLowerCase().trim();
    const targetEmail = req.body.targetEmail ? req.body.targetEmail.toLowerCase().trim() : null;
    const { accept } = req.body;
    
    if (!targetEmail || userEmail === targetEmail) {
        return res.status(400).json({ message: 'Invalid operation.' });
    }

    const user = getUser(userEmail);
    // Remove from requests
    user.requests = user.requests.filter(r => r.fromEmail !== targetEmail);
    
    if (accept && targetEmail) {
        const targetUser = getUser(targetEmail);
        
        // Add to User's list if not present
        if (!user.friends.includes(targetEmail)) user.friends.push(targetEmail);
        
        // Add User to Target's list if not present
        if (!targetUser.friends.includes(userEmail)) targetUser.friends.push(userEmail);
    }
    res.json({ success: true });
});

// REWRITTEN TRANSFER LOGIC FOR ROBUSTNESS
app.post('/api/inventory/transfer', (req, res) => {
    const { fromEmail, toEmail, cardId } = req.body;
    if (!fromEmail || !toEmail || !cardId) return res.status(400).json({ message: 'Missing parameters' });
    
    const sender = getUser(fromEmail);
    const receiver = getUser(toEmail);
    
    // Normalize ID for comparison (trim spaces, string cast)
    const targetId = String(cardId).trim();

    // 1. FIND INDEX
    const itemIndex = sender.inventory.findIndex(i => String(i.id).trim() === targetId);
    
    if (itemIndex === -1) {
        console.warn(`Transfer failed: Item ${targetId} not found in ${fromEmail}`);
        return res.status(404).json({ message: 'Item not found in sender inventory' });
    }

    // 2. REMOVE (Splice is safer than filter for single item moves)
    const [transferredItem] = sender.inventory.splice(itemIndex, 1);

    // 3. CLONE & ADD
    // We clone to break any reference issues, although in-memory JS logic usually handles object moves fine.
    // This also ensures the receiver gets a "fresh" copy.
    const newItemForReceiver = JSON.parse(JSON.stringify(transferredItem));
    
    // Optional: Deduplication if unique? For now, we allow duplicates.
    receiver.inventory.push(newItemForReceiver);

    console.log(`TRANSFERRED: ${targetId} from ${fromEmail} to ${toEmail}`);
    res.json({ success: true, item: newItemForReceiver });
});

// --- ROUTES: ROOMS / CHAT ---

app.post('/api/rooms', (req, res) => {
    const { roomId, hostName } = req.body;
    if (!db.rooms[roomId]) {
        db.rooms[roomId] = {
            id: roomId,
            host: hostName,
            members: [{ name: hostName, hp: 100, lastSeen: Date.now() }],
            messages: []
        };
    }
    res.json({ success: true, roomId });
});

app.post('/api/rooms/:roomId/join', (req, res) => {
    const { roomId } = req.params;
    const { userName, hp } = req.body;
    
    const room = db.rooms[roomId];
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const existingMember = room.members.find(m => m.name === userName);
    if (!existingMember) {
        room.members.push({ name: userName, hp: hp || 100, lastSeen: Date.now() });
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
    }
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
    res.json(msg);
});

// --- MOCK GEMINI ---
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
