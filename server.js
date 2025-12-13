
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- IN-MEMORY DATABASE (Simulace databáze) ---
// V reálné produkci by zde bylo připojení k MongoDB/PostgreSQL
const db = {
    users: {},     // { email: { nickname, inventory: [], friends: [], requests: [] } }
    rooms: {},     // { roomId: { host, users: [], messages: [] } }
    codes: {}      // Cache pro Gemini/QR kódy
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
    
    // Check duplication
    const existingIndex = user.inventory.findIndex(i => i.id === newItem.id);
    if (existingIndex >= 0) {
        user.inventory[existingIndex] = newItem; // Update
    } else {
        user.inventory.push(newItem); // Insert
    }
    res.json(newItem);
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

// --- ROUTES: FRIENDS ---

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

    if (!targetEmail || senderEmail === targetEmail) {
        return res.status(400).json({ message: 'Invalid target email' });
    }

    const targetUser = getUser(targetEmail); // Creates target if not exists
    
    // Check if already friends or requested
    if (targetUser.friends.includes(senderEmail)) {
        return res.json({ message: 'Already friends' });
    }
    if (targetUser.requests.some(r => r.fromEmail === senderEmail)) {
        return res.json({ message: 'Request already sent' });
    }

    targetUser.requests.push({
        fromEmail: senderEmail,
        timestamp: Date.now()
    });

    console.log(`Friend request: ${senderEmail} -> ${targetEmail}`);
    res.json({ success: true });
});

app.post('/api/users/:email/friends/respond', (req, res) => {
    const userEmail = req.params.email.toLowerCase().trim();
    const targetEmail = req.body.targetEmail ? req.body.targetEmail.toLowerCase().trim() : null;
    const { accept } = req.body;
    
    const user = getUser(userEmail);
    // Remove request
    user.requests = user.requests.filter(r => r.fromEmail !== targetEmail);

    if (accept && targetEmail) {
        const targetUser = getUser(targetEmail);
        
        // Add to both lists if not already there
        if (!user.friends.includes(targetEmail)) user.friends.push(targetEmail);
        if (!targetUser.friends.includes(userEmail)) targetUser.friends.push(userEmail);
        
        console.log(`Friends connected: ${userEmail} <-> ${targetEmail}`);
    }

    res.json({ success: true });
});

// --- ROUTES: TRANSFER / BURZA (OPRAVENO - ROBUSTNÍ LOGIKA) ---

app.post('/api/inventory/transfer', (req, res) => {
    const { fromEmail, toEmail, cardId } = req.body;
    
    if (!fromEmail || !toEmail || !cardId) {
        return res.status(400).json({ message: 'Missing parameters' });
    }

    const sender = getUser(fromEmail);
    const receiver = getUser(toEmail);

    // 1. Find Index of Item
    const itemIndex = sender.inventory.findIndex(i => i.id === cardId);
    
    if (itemIndex === -1) {
        console.log(`Transfer FAILED: Item ${cardId} not found in ${sender.email}`);
        return res.status(404).json({ message: 'Item not found in sender inventory' });
    }

    // 2. ATOMIC MOVE: Remove from Sender using splice (returns array of removed items)
    const [movedItem] = sender.inventory.splice(itemIndex, 1);
    
    // 3. Add to Receiver
    // Create a deep copy to ensure no reference issues, though splice handles references fine
    const receivedItem = JSON.parse(JSON.stringify(movedItem));
    
    // Check duplication on receiver side just in case (overwrite if exists to be safe)
    const receiverExistingIndex = receiver.inventory.findIndex(i => i.id === cardId);
    if (receiverExistingIndex >= 0) {
        receiver.inventory[receiverExistingIndex] = receivedItem;
    } else {
        receiver.inventory.push(receivedItem);
    }

    console.log(`Transfer SUCCESS: ${cardId} moved from ${sender.email} to ${receiver.email}`);
    
    res.json({ success: true });
});

// --- ROUTES: ROOMS / CHAT ---

app.post('/api/rooms', (req, res) => {
    const { roomId, hostName } = req.body;
    if (!db.rooms[roomId]) {
        db.rooms[roomId] = {
            id: roomId,
            host: hostName,
            users: [hostName],
            messages: []
        };
    }
    res.json({ success: true, roomId });
});

app.post('/api/rooms/:roomId/join', (req, res) => {
    const { roomId } = req.params;
    const { userName } = req.body;
    
    const room = db.rooms[roomId];
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (!room.users.includes(userName)) {
        room.users.push(userName);
        room.messages.push({
            id: 'sys-' + Date.now(),
            sender: 'SYSTEM',
            text: `${userName} se připojil/a.`,
            timestamp: Date.now(),
            isSystem: true
        });
    }
    res.json({ success: true });
});

app.post('/api/rooms/:roomId/leave', (req, res) => {
    const { roomId } = req.params;
    const { userName } = req.body;
    
    const room = db.rooms[roomId];
    if (room) {
        room.users = room.users.filter(u => u !== userName);
        room.messages.push({
            id: 'sys-' + Date.now(),
            sender: 'SYSTEM',
            text: `${userName} odešel/a.`,
            timestamp: Date.now(),
            isSystem: true
        });
        // Cleanup empty rooms
        if (room.users.length === 0) {
            delete db.rooms[roomId];
        }
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

    const msg = {
        id: Date.now().toString(),
        sender,
        text,
        timestamp: Date.now()
    };
    
    room.messages.push(msg);
    // Keep only last 50 messages
    if (room.messages.length > 50) room.messages.shift();

    res.json(msg);
});

// --- MOCK GEMINI ---
app.post('/api/gemini/interpret-code', (req, res) => {
    // Mock response if Gemini API key isn't set on backend
    res.json({
        id: req.body.code,
        title: "Mystery Item",
        description: "An item generated by backend mock.",
        type: "PŘEDMĚT",
        rarity: "Common",
        stats: []
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Nexus Backend running on port ${PORT}`);
});
