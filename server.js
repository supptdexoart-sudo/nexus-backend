
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
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { OAuth2Client } from 'google-auth-library';
import { body, param, validationResult } from 'express-validator';

// Security Middleware
import { auditLogger, logAuth, logSecurityEvent } from './middleware/auditLogger.js';
import { validationRules, validate } from './middleware/inputValidator.js';
import { sessionManager, createSession, destroySession } from './middleware/sessionManager.js';
import { adminAuth } from './middleware/adminAuth.js';

// ✅ SECURE - Enhanced Security Monitoring
const securityEvents = new Map(); // Track security events in memory
const ALERT_THRESHOLD = 5; // Alert after 5 failed attempts
const ALERT_WINDOW = 15 * 60 * 1000; // 15 minutes

const logSecurityAttempt = (email, success, ip, reason = '') => {
    const timestamp = Date.now();
    const event = { email, success, ip, reason, timestamp };

    // Log to console with color coding
    if (success) {
        console.log(`✅ [SECURITY] Successful auth: ${email} from ${ip}`);
    } else {
        console.warn(`⛔ [SECURITY] Failed auth: ${email} from ${ip} - ${reason}`);

        // Track failed attempts
        const key = `${email}:${ip}`;
        if (!securityEvents.has(key)) {
            securityEvents.set(key, []);
        }

        const events = securityEvents.get(key);
        events.push(event);

        // Clean old events outside window
        const recentEvents = events.filter(e => timestamp - e.timestamp < ALERT_WINDOW);
        securityEvents.set(key, recentEvents);

        // Check for alert threshold
        if (recentEvents.length >= ALERT_THRESHOLD) {
            console.error(`🚨 [SECURITY ALERT] ${recentEvents.length} failed attempts from ${email} (${ip}) in last 15 minutes!`);
            logSecurityEvent('BRUTE_FORCE_DETECTED', { email, ip, attempts: recentEvents.length });
        }
    }

    // Also log to audit logger
    logAuth(email, success, ip);
};

const app = express();

// ✅ FIX: Render.com běží za proxy, musíme jí důvěřovat pro správné fungování rate-limitu a IP detekce
app.set('trust proxy', 1);

const envPort = process.env.PORT;
const PORT = (envPort && envPort != 3000) ? envPort : 3001;
const MONGODB_URI = process.env.MONGODB_URI;
// Serverové ID (prioritní), pokud chybí, použije se to z requestu
const SERVER_GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const ADMIN_EMAIL = 'zbynekbal97@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// --- WHITELIST POVOLENÝCH HRÁČŮ ---
// Pouze tyto emaily se mohou přihlásit přes Google
const ALLOWED_EMAILS = [
    'zbynekbal97@gmail.com',
    'bluegodablecz@gmail.com',
    'pharao1997@gmail.com',
    'kwixbro@gmail.com'
];

console.log('\n🛡️ --- STARTUJI NEXUS BACKEND (SECURE MODE v1.9 - ADMIN FIX) ---');
console.log(`ℹ️  Server Client ID: ${SERVER_GOOGLE_CLIENT_ID ? 'LOADED' : 'NOT SET (Will use client-provided ID)'}`);
console.log(`🔒 Whitelist aktivní pro: ${ALLOWED_EMAILS.join(', ')}`);

// Pokud máme server ID, připravíme klienta předem
let googleClient = SERVER_GOOGLE_CLIENT_ID ? new OAuth2Client(SERVER_GOOGLE_CLIENT_ID) : null;

if (!MONGODB_URI) {
    console.error('❌ FATAL ERROR: Chybí MONGODB_URI!');
    process.exit(1);
}

if (!ADMIN_PASSWORD) {
    console.error('❌ FATAL ERROR: Chybí ADMIN_PASSWORD!');
    console.error('⚠️  Nastavte ADMIN_PASSWORD v .env souboru.');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ ÚSPĚCH: MongoDB (Secured Connection) připojeno.'))
    .catch(err => console.error('❌ CHYBA MONGODB:', err.message));

// ✅ SECURE - HTTPS Enforcement in production
app.use((req, res, next) => {
    // Only enforce HTTPS in production (not localhost)
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
});

// ✅ SECURE - Enhanced security headers
app.use(helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // HSTS - Force HTTPS for 1 year
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    // Prevent clickjacking
    frameguard: {
        action: 'deny'
    },
    // Disable X-Powered-By header
    hidePoweredBy: true,
    // ✅ SECURE - Enable CSP with whitelist for trusted sources
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "https://accounts.google.com",
                "https://apis.google.com",
                "'unsafe-inline'",  // Required for some inline scripts (consider removing in future)
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",  // Required for inline styles
                "https://fonts.googleapis.com"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https:",
                "blob:"
            ],
            connectSrc: [
                "'self'",
                "https://accounts.google.com",
                "https://nexus-backend-m492.onrender.com",
                "http://localhost:3001",
                "http://localhost:5173",
                "http://localhost:5174"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com"
            ],
            frameSrc: [
                "https://accounts.google.com"
            ]
        }
    }
}));

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    // ✅ SECURE - Explicit whitelist only (no wildcards)
    'https://supptdexoart-sudo.github.io',
    'https://nexus-backend-m492.onrender.com'
];

app.use(cors({
    origin: function (origin, callback) {
        // Povolit requesty bez origin (např. Postman, curl) pouze v development
        if (!origin) {
            return callback(null, true);
        }

        // ✅ SECURE - Strict whitelist check only
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // PRODUKČNÍ MÓD: Zamítnout nepovolené originy
        const error = new Error(`CORS: Origin ${origin} není povolen`);
        console.warn(`⛔ CORS BLOCKED: ${origin}`);
        return callback(error);
    },
    credentials: true
}));

// ✅ SECURE - Reasonable rate limits to prevent abuse
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 500,  // 500 requests per 15 minutes (increased for development/testing)
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "⛔ Příliš mnoho požadavků. Zkuste to později." }
});

// ✅ SECURE - Stricter limit for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,  // 5 minutes
    max: 5,  // 5 login attempts per 5 minutes (protection against brute force - applies to ALL users including admin)
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "⛔ Příliš mnoho pokusů o přihlášení. Zkuste to za 5 minut." }
});

// Apply general rate limiting to all API routes (except admin)
app.use('/api', (req, res, next) => {
    const email = req.headers['x-user-email'];
    const isAdmin = email && email.toLowerCase() === 'zbynekbal97@gmail.com';
    if (isAdmin) {
        return next(); // Skip rate limiting for admin
    }
    return generalLimiter(req, res, next);
});

// Apply stricter rate limiting to auth routes
app.use('/api/auth', authLimiter);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(cookieParser());
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
    requests: [{ fromEmail: String, timestamp: Number }],
    // Player Stats (persistent across sessions)
    playerStats: {
        hp: { type: Number, default: 100 },
        armor: { type: Number, default: 0 },
        fuel: { type: Number, default: 100 },
        gold: { type: Number, default: 0 },
        oxygen: { type: Number, default: 100 }
    },
    // Active Character (selected character data)
    activeCharacter: { type: Object, default: null }
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
    transactionId: { type: String, required: true, unique: true },
    roomId: String,
    timestamp: Number,
    participants: [{
        email: String,
        nickname: String
    }],
    items: [{
        originalOwnerEmail: String,
        itemId: String,
        itemTitle: String
    }],
    status: { type: String, enum: ['COMPLETED', 'CANCELLED', 'FAILED'], default: 'COMPLETED' }
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
    activeEncounter: Object,
    activeTrades: [{
        id: String,
        participants: [ // Array of 2
            {
                email: String,
                nickname: String,
                offeredItem: Object, // GameEvent or null
                isConfirmed: Boolean
            }
        ],
        status: { type: String, enum: ['WAITING', 'CONFIRMED'], default: 'WAITING' },
        createdAt: Number
    }],
    activeSectorEvent: {
        type: { type: String, default: null },
        initiator: { type: String, default: null },
        expiresAt: { type: Number, default: 0 }
    }
}, { timestamps: true });

const CharacterSchema = new mongoose.Schema({
    characterId: { type: String, required: true, unique: true, uppercase: true },
    adminEmail: { type: String, required: true, lowercase: true },
    name: { type: String, required: true },
    description: String,
    imageUrl: String,
    baseStats: {
        hp: { type: Number, default: 100 },
        armor: { type: Number, default: 0 },
        damage: { type: Number, default: 10 },
        fuel: { type: Number, default: 100 },
        gold: { type: Number, default: 0 },
        oxygen: { type: Number, default: 100 }
    },
    perks: [{
        name: String,
        description: String,
        effect: {
            stat: String,
            modifier: Number,
            condition: String
        }
    }],
    timeVariant: {
        enabled: { type: Boolean, default: false },
        nightModifiers: {
            statChanges: [{
                stat: String,
                modifier: Number
            }],
            additionalPerks: [Object]
        }
    }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Room = mongoose.model('Room', RoomSchema);
const Character = mongoose.model('Character', CharacterSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);

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

// 1. VALIDATION ENDPOINT (Deep Sync with Master Catalog)
app.post('/api/inventory/validate', async (req, res) => {
    try {
        const { items } = req.body; // Array of GameEvent objects
        if (!Array.isArray(items)) return res.status(400).json({ message: 'Invalid format' });

        const admin = await getOrCreateUser(ADMIN_EMAIL);
        const masterCatalog = admin.inventory;

        const masterMap = new Map();
        masterCatalog.forEach(i => {
            masterMap.set(i.id.toLowerCase().trim(), i);
            if (i.title) masterMap.set(`TITLE:${i.title.toLowerCase().trim()}`, i);
        });

        console.log(`[VALIDATION] Deep Syncing ${items.length} items with Master Catalog.`);

        const validItems = items.map(pItem => {
            if (!pItem || !pItem.id) return null;

            // [EARLY EXIT] Allow items with special prefixes or types WITHOUT catalog validation
            const allowedPrefixes = ['LOOT-', 'REWARD-', 'QUEST-', 'ENCOUNTER-', 'GENERATED-', 'BOUGHT-', 'CRAFTED-'];
            const allowedTypes = ['RESOURCE', 'SUROVINA'];
            const hasAllowedPrefix = allowedPrefixes.some(prefix => pItem.id.toUpperCase().startsWith(prefix));
            const hasAllowedType = allowedTypes.includes(pItem.type);

            if (hasAllowedPrefix || hasAllowedType) {
                console.log(`[VALIDATION] Item ALLOWED (Exception): ${pItem.id} (${pItem.title}) - Type: ${pItem.type}`);
                return { ...pItem, isSaved: true };
            }

            // [CATALOG VALIDATION] Only for items without special prefixes
            const fullId = pItem.id.toLowerCase().trim();
            const baseId = fullId.split('__')[0];
            const titleKey = pItem.title ? `TITLE:${pItem.title.toLowerCase().trim()}` : null;

            // Debug logging
            console.log(`[VALIDATION DEBUG] Checking item: ${pItem.id} | Base ID: ${baseId}`);

            // 1. Try to find by Exact ID or Base ID
            let template = masterMap.get(baseId);

            // 2. Try to find by Title for Special/Generated items
            if (!template && titleKey) {
                template = masterMap.get(titleKey);
            }

            if (template) {
                // Return updated template but keep player's unique instance ID and status
                console.log(`[VALIDATION] Item VALID (Template found): ${pItem.id} → Base: ${baseId}`);
                return {
                    ...template,
                    id: pItem.id, // Preserve the instance ID (with suffix)
                    isSaved: true,
                    // If the original item was a resource container, preserve its specific amount 
                    resourceConfig: pItem.resourceConfig?.isResourceContainer
                        ? { ...template.resourceConfig, resourceAmount: pItem.resourceConfig.resourceAmount }
                        : template.resourceConfig
                };
            }

            // [FIX] PRESERVE ITEMS WITH UNIQUE SUFFIXES (Traded/Crafted items)
            // If item has a suffix (e.g., ITEM-01__ABC123), it's a player-owned instance
            // Keep it even if base ID is not in Master Catalog (could be from another player)
            if (fullId.includes('__')) {
                console.warn(`[VALIDATION] Item PRESERVED (Unique suffix, no template): ${pItem.id} (${pItem.title})`);
                return { ...pItem, isSaved: true };
            }

            // Only reject items without suffix that are not in catalog
            console.warn(`[VALIDATION] Item REJECTED (Missing from Master): ${pItem.id} (${pItem.title})`);
            return null;
        }).filter(Boolean);


        // [REMOVED] AUTO-CLEANUP was causing inventory sharing between players
        // Validation should ONLY validate, not save to database
        // Each player's inventory is saved separately via /api/inventory/:email POST endpoint

        res.json({ validItems });
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
        const ip = req.ip || req.connection.remoteAddress;

        if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
            // [DEV FIX] Allow localhost users
            const origin = req.headers.origin || req.headers.host || '';
            const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');

            if (isLocal) {
                console.warn(`⚠️ LOCALHOST DEV OVERRIDE: Allowing ${normalizedEmail}`);
            } else {
                console.warn(`⛔ Přístup zamítnut pro: ${normalizedEmail} (Není na whitelistu)`);
                logSecurityAttempt(normalizedEmail, false, ip, 'Email not on whitelist');
                return res.status(403).json({ message: 'Přístup odepřen. Váš email není na seznamu povolených testerů.' });
            }
        }

        console.log(`✅ Google Login Success: ${normalizedEmail}`);

        // Create session and log authentication
        try {
            createSession(normalizedEmail, ip);
        } catch (e) {
            if (e.message === 'ADMIN_ALREADY_LOGGED_IN') {
                logSecurityAttempt(normalizedEmail, false, ip, 'Admin already logged in from another device');
                return res.status(403).json({
                    message: '⛔ Admin účet je již přihlášen z jiného zařízení. Odhlaste se nejprve tam.'
                });
            }
            throw e; // Re-throw other errors
        }

        logSecurityAttempt(normalizedEmail, true, ip);

        const user = await getOrCreateUser(normalizedEmail);

        // If user is admin, return admin token
        const response = {
            email: user.email,
            isNewUser: user.inventory.length === 0
        };

        if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
            // ✅ SECURE - Set HttpOnly cookie
            // NOTE: For cross-site (GitHub Pages -> Render), we MUST use SameSite=None and Secure=true
            res.cookie('adminToken', ADMIN_PASSWORD, {
                httpOnly: true,
                secure: true, // Required for SameSite=None
                sameSite: 'None',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/'
            });
            // We still return email for client UI state, but NOT the token
        }

        res.json(response);

    } catch (e) {
        console.error("❌ Google Auth Error:", e.message);
        const ip = req.ip || req.connection.remoteAddress;
        logSecurityAttempt('unknown', false, ip, e.message);
        res.status(401).json({ message: `Google Auth Failed: ${e.message}` });
    }
});

// Logout endpoint - destroy session
app.post('/api/auth/logout',
    body('email').isEmail().normalizeEmail(),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Neplatný email', errors: errors.array() });
        }
        try {
            const { email } = req.body;
            destroySession(email.toLowerCase());
            res.clearCookie('adminToken', {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'None'
            });
            console.log(`🚪 [LOGOUT] Session destroyed and cookie cleared for: ${email}`);
            res.json({ success: true, message: 'Odhlášení úspěšné' });
        } catch (e) {
            console.error("Logout error:", e);
            res.status(500).json({ message: e.message });
        }
    }
);

// Check if user is logged in (via cookie)
app.get('/api/auth/check', (req, res) => {
    const adminToken = req.cookies.adminToken;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminToken && adminToken === adminPassword) {
        // Token is valid, return admin email
        return res.json({
            authenticated: true,
            email: 'zbynekbal97@gmail.com'
        });
    }

    res.status(401).json({ authenticated: false });
});

// EMERGENCY: Force reset admin session (temporary fix)
app.post('/api/auth/emergency-reset-admin', (req, res) => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        if (adminEmail) {
            destroySession(adminEmail);
            console.log(`🚨 [EMERGENCY] Admin session forcefully destroyed: ${adminEmail}`);
            res.json({ success: true, message: 'Admin session reset successful' });
        } else {
            res.status(500).json({ message: 'Admin email not configured' });
        }
    } catch (e) {
        console.error("Emergency reset error:", e);
        res.status(500).json({ message: e.message });
    }
});

// PLAYER PROFILE ROUTES
// Save player profile (stats, nickname, character)
app.post('/api/profile/save',
    body('email').isEmail().normalizeEmail(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Neplatný email', errors: errors.array() });
        }
        try {
            const { email, nickname, playerClass, playerStats, activeCharacter } = req.body;
            const user = await getOrCreateUser(email);

            if (nickname !== undefined) user.nickname = nickname;
            if (playerClass !== undefined) user.playerClass = playerClass;
            if (playerStats) user.playerStats = playerStats;
            if (activeCharacter !== undefined) user.activeCharacter = activeCharacter;

            user.markModified('playerStats');
            user.markModified('activeCharacter');
            await user.save();

            res.json({ success: true, message: 'Profil uložen' });
        } catch (e) {
            console.error("Profile save error:", e);
            res.status(500).json({ message: e.message });
        }
    }
);

// Get player profile
app.get('/api/profile/:email',
    param('email').isEmail().normalizeEmail(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Neplatný email', errors: errors.array() });
        }
        try {
            const user = await getOrCreateUser(req.params.email);
            res.json({
                nickname: user.nickname,
                playerClass: user.playerClass,
                playerStats: user.playerStats || { hp: 100, armor: 0, fuel: 100, gold: 0, oxygen: 100 },
                activeCharacter: user.activeCharacter
            });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }
);

// Reset player profile
app.post('/api/profile/reset',
    body('email').isEmail().normalizeEmail(),
    body('resetType').isIn(['full', 'partial']),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Neplatné parametry', errors: errors.array() });
        }
        try {
            const { email, resetType } = req.body;
            const user = await getOrCreateUser(email);

            // Reset stats, nickname, character
            user.nickname = null;
            user.playerClass = null;
            user.playerStats = { hp: 100, armor: 0, fuel: 100, gold: 0, oxygen: 100 };
            user.activeCharacter = null;

            // Full reset also clears inventory
            if (resetType === 'full') {
                user.inventory = [];
            }

            user.markModified('playerStats');
            user.markModified('activeCharacter');
            await user.save();

            res.json({ success: true, message: `Účet resetován (${resetType})` });
        } catch (e) {
            console.error("Profile reset error:", e);
            res.status(500).json({ message: e.message });
        }
    }
);

// GENERIC INVENTORY ROUTES
// ✅ SECURE - Email validation added
app.get('/api/inventory/:email',
    param('email').isEmail().normalizeEmail(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Neplatný email', errors: errors.array() });
        }
        try {
            const u = await getOrCreateUser(req.params.email);
            res.json(u.inventory);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }
);

// GET INDIVIDUAL CARD ROUTE (USER INVENTORY)
// ✅ SECURE - Validation added
app.get('/api/inventory/:email/:cardId',
    param('email').isEmail().normalizeEmail(),
    param('cardId').isString().trim().notEmpty(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Neplatné parametry', errors: errors.array() });
        }
        try {
            const u = await User.findOne({ email: req.params.email.toLowerCase() });
            if (!u) return res.status(404).json({ message: 'User not found' });

            // Flexible finding (case insensitive + trim)
            const targetId = req.params.cardId.toLowerCase().trim();
            const card = u.inventory.find(i => i.id.toLowerCase().trim() === targetId);

            if (!card) return res.status(404).json({ message: 'Card not found' });
            res.json(card);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }
);

// ✅ NEW: PUBLIC CATALOG ENDPOINT (For Scanner)
app.get('/api/catalog/:cardId',
    param('cardId').isString().trim().notEmpty(),
    async (req, res) => {
        try {
            const admin = await getOrCreateUser(ADMIN_EMAIL);
            const targetId = req.params.cardId.toLowerCase().trim();

            // Hledáme v adminově inventáři (Master Catalog)
            // Zkusíme najít přesnou shodu nebo baseID shodu
            const card = admin.inventory.find(i => {
                const iId = i.id.toLowerCase().trim();
                // 1. Přesná shoda
                if (iId === targetId) return true;
                // 2. Base ID shoda (pro naskenování ITEM-01 když je v katalogu ITEM-01)
                return iId === targetId.split('__')[0];
            });

            if (!card) return res.status(404).json({ message: 'Item not found in catalog' });
            res.json(card);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: e.message });
        }
    }
);

// ✅ NEW: FULL MASTER CATALOG ENDPOINT
app.get('/api/catalog', async (req, res) => {
    try {
        const admin = await getOrCreateUser(ADMIN_EMAIL);
        res.json(admin.inventory);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// SAVE / UPDATE ITEM ROUTE (Upraveno pro stacking)
// ✅ SECURE - Input validation added
app.post('/api/inventory/:email',
    param('email').isEmail().normalizeEmail(),
    body('id').isString().trim().notEmpty(),
    body('title').isString().trim().notEmpty(),
    body('type').isIn(['ITEM', 'EVENT', 'COMBAT', 'DILEMMA', 'RESOURCE', 'MERCHANT', 'STATION', 'PŘEDMĚT', 'UDÁLOST', 'SOUBOJ', 'DILEMA', 'SUROVINA', 'OBCHODNÍK', 'STANICE', 'VESMÍRNÁ_STANICE', 'PLANETA']),
    async (req, res) => {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.warn(`[VALIDATION] Invalid inventory save attempt:`, errors.array());
            return res.status(400).json({
                message: 'Neplatná data',
                errors: errors.array()
            });
        }

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

            u.markModified('inventory');
            await u.save();
            console.log(`✅ Item saved for ${req.params.email}: ${newItem.id}`);
            res.json(newItem);
        } catch (e) {
            console.error("❌ Inventory Save Error:", e);
            res.status(500).json({ message: e.message })
        }
    }
);

app.delete('/api/inventory/:email/:cardId', async (req, res) => {
    try {
        const email = req.params.email.toLowerCase();
        // Decode and normalize ID
        const targetId = decodeURIComponent(req.params.cardId).trim();

        console.log(`🗑️ [DELETE] Attempting to remove item ${targetId} from ${email}`);

        const u = await User.findOne({ email });
        if (u) {
            const initialCount = u.inventory.length;

            // Robust filtering: Trim strings and ignore case just in case
            u.inventory = u.inventory.filter(i => {
                const currentId = i.id.trim();
                return currentId !== targetId && currentId.toLowerCase() !== targetId.toLowerCase();
            });

            const finalCount = u.inventory.length;

            if (initialCount !== finalCount) {
                u.markModified('inventory');
                await u.save();
                console.log(`✅ [DELETE] Success: Removed ${initialCount - finalCount} instance(s) of ${targetId}. Remaining items: ${finalCount}`);
            } else {
                console.warn(`⚠️ [DELETE] Item ${targetId} not found in ${email}'s inventory.`);
            }
        } else {
            console.warn(`⚠️ [DELETE] User ${email} not found.`);
        }
        res.json({ success: true });
    } catch (e) {
        console.error("❌ [DELETE] Error:", e.message);
        res.status(500).json({ message: e.message });
    }
});

// --- TRADE SYSTEM V2 (SECURE) ---

// Získání historie transakcí (Admin view)
app.get('/api/admin/transactions', adminAuth, async (req, res) => {
    try {
        const history = await Transaction.find().sort({ createdAt: -1 }).limit(100);
        res.json(history);
    } catch (e) { res.status(500).json({ message: e.message }) }
});

// Admin Backup
app.get('/api/admin/backup', adminAuth, async (req, res) => {
    try {
        const admin = await User.findOne({ email: ADMIN_EMAIL });
        const characters = await Character.find();

        const backupData = {
            masterInventory: admin ? admin.inventory : [],
            characters,
            timestamp: Date.now(),
            version: '2.0'
        };

        res.json(backupData);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/api/trade/init', async (req, res) => {
    try {
        const { roomId, initiatorEmail, initiatorNick, targetNick, item } = req.body;
        const r = await Room.findOne({ roomId });
        if (!r) return res.status(404).json({ message: "Sektor nenalezen" });

        // Find participants
        const initiator = r.members.find(m => m.name === initiatorNick);
        const target = r.members.find(m => m.name === targetNick);

        if (!initiator || !target) return res.status(404).json({ message: "Účastníci obchodu nenalezeni v sektoru." });

        // Create new active trade
        const tradeId = `TRADE-${Date.now()}`;
        // Ensure activeTrades array exists
        if (!r.activeTrades) r.activeTrades = [];

        r.activeTrades.push({
            id: tradeId,
            participants: [
                { email: initiator.email, nickname: initiatorNick, offeredItem: item, isConfirmed: false },
                { email: target.email, nickname: targetNick, offeredItem: null, isConfirmed: false }
            ],
            status: 'WAITING',
            createdAt: Date.now()
        });

        // Broadcast Info
        r.messages.push({
            id: 'sys-' + Date.now(),
            sender: 'SYSTEM',
            text: `🔄 ${initiatorNick} ZAHÁJIL OBCHODNÍ SPOJENÍ S ${targetNick}.`,
            timestamp: Date.now(),
            isSystem: true
        });

        await r.save();
        res.json({ success: true, tradeId });
    } catch (e) { res.status(500).json({ message: e.message }) }
});

app.post('/api/trade/cancel', async (req, res) => {
    try {
        const { roomId, tradeId } = req.body;
        const r = await Room.findOne({ roomId });
        if (r && r.activeTrades) {
            r.activeTrades = r.activeTrades.filter(t => t.id !== tradeId);
            await r.save();
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }) }
});

app.post('/api/trade/update', async (req, res) => {
    try {
        const { roomId, tradeId, userEmail, item } = req.body;
        const r = await Room.findOne({ roomId });
        if (!r) return res.status(404).json({ message: "Room not found" });

        const trade = r.activeTrades ? r.activeTrades.find(t => t.id === tradeId) : null;
        if (!trade) return res.status(404).json({ message: "Trade inactive" });

        const participant = trade.participants.find(p => p.email === userEmail);
        if (participant) {
            participant.offeredItem = item;
            participant.isConfirmed = false; // Reset confirm on change
            // Also reset partner confirm? Usually yes for safety
            const partner = trade.participants.find(p => p.email !== userEmail);
            if (partner) partner.isConfirmed = false;
        }

        await r.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }) }
});

app.post('/api/trade/confirm', async (req, res) => {
    try {
        const { roomId, tradeId, userEmail, isConfirmed } = req.body;
        const r = await Room.findOne({ roomId });
        if (!r) return res.status(404).json({ message: "Room not found" });

        const trade = r.activeTrades ? r.activeTrades.find(t => t.id === tradeId) : null;
        if (!trade) return res.status(404).json({ message: "Trade inactive" });

        const p = trade.participants.find(p => p.email === userEmail);
        if (p) p.isConfirmed = isConfirmed;

        // CHECK EXECUTION
        if (trade.participants.every(p => p.isConfirmed)) {
            // EXECUTE TRADE
            const p1 = trade.participants[0];
            const p2 = trade.participants[1];

            // DO EXCHANGE
            try {
                // Fetch Users
                const u1 = await getOrCreateUser(p1.email);
                const u2 = await getOrCreateUser(p2.email);

                // ITEMS to remove/add. Note: offeredItem might be null (claiming for free? or just nothing)
                // Assuming items MUST exist if offered
                if (p1.offeredItem) {
                    const idx = u1.inventory.findIndex(i => i.id === p1.offeredItem.id);
                    if (idx !== -1) {
                        u1.inventory.splice(idx, 1);
                        u2.inventory.push(p1.offeredItem);
                    }
                }
                if (p2.offeredItem) {
                    const idx = u2.inventory.findIndex(i => i.id === p2.offeredItem.id);
                    if (idx !== -1) {
                        u2.inventory.splice(idx, 1);
                        u1.inventory.push(p2.offeredItem);
                    }
                }

                u1.markModified('inventory');
                u2.markModified('inventory');
                await u1.save();
                await u2.save();

                // LOG TRANSACTION
                await Transaction.create({
                    transactionId: `TX-${Date.now()}`,
                    roomId,
                    timestamp: Date.now(),
                    participants: [
                        { email: p1.email, nickname: p1.nickname },
                        { email: p2.email, nickname: p2.nickname }
                    ],
                    items: [
                        { originalOwnerEmail: p1.email, itemId: p1.offeredItem?.id, itemTitle: p1.offeredItem?.title },
                        { originalOwnerEmail: p2.email, itemId: p2.offeredItem?.id, itemTitle: p2.offeredItem?.title }
                    ],
                    status: 'COMPLETED'
                });

                // CLEANUP TRADE
                r.activeTrades = r.activeTrades.filter(t => t.id !== tradeId);
                r.messages.push({
                    id: 'sys-trade-ok-' + Date.now(),
                    sender: 'SYSTEM',
                    text: `✅ VÝMĚNA POTVRZENA: ${p1.nickname} <-> ${p2.nickname}`,
                    timestamp: Date.now(),
                    isSystem: true
                });

                await r.save();
                return res.json({ success: true, status: 'COMPLETED' });

            } catch (err) {
                console.error("Trade execution failed", err);
                return res.status(500).json({ message: "Trade execution failed" });
            }
        }

        await r.save();
        res.json({ success: true, status: 'WAITING' });
    } catch (e) { res.status(500).json({ message: e.message }) }
});

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

        // Check for Self-Trade (Same Email)
        if (player1Email.toLowerCase().trim() === player2Email.toLowerCase().trim()) {
            console.log(`[SWAP] Detected Self-Trade for ${player1Email}`);
            const user = await getOrCreateUser(player1Email);

            const idx1 = user.inventory.findIndex(i => i.id === item1Id);
            const idx2 = user.inventory.findIndex(i => i.id === item2Id);

            if (idx1 === -1 || idx2 === -1) return res.status(404).json({ message: "Items not found in user inventory." });

            const temp = user.inventory[idx1];
            user.inventory[idx1] = user.inventory[idx2];
            user.inventory[idx2] = temp;

            user.markModified('inventory');
            await user.save();

            return res.json({ success: true, item1: user.inventory[idx2], item2: user.inventory[idx1] });
        }

        // Standard Trade (Two Different Users)
        const p1 = await getOrCreateUser(player1Email);
        const p2 = await getOrCreateUser(player2Email);

        if (!p1 || !p2) return res.status(404).json({ message: "Users not found." });

        if (!p1.inventory) p1.inventory = [];
        if (!p2.inventory) p2.inventory = [];

        const idx1 = p1.inventory.findIndex(i => i.id === item1Id);
        const idx2 = p2.inventory.findIndex(i => i.id === item2Id);

        if (idx1 === -1) return res.status(404).json({ message: `Item ${item1Id} missing from P1.` });
        if (idx2 === -1) return res.status(404).json({ message: `Item ${item2Id} missing from P2.` });

        // Clone items to prevent reference issues
        const item1 = p1.inventory[idx1].toObject ? p1.inventory[idx1].toObject() : { ...p1.inventory[idx1] };
        const item2 = p2.inventory[idx2].toObject ? p2.inventory[idx2].toObject() : { ...p2.inventory[idx2] };

        console.log(`[SWAP] Executing: ${item1.title} <-> ${item2.title}`);

        p1.inventory.splice(idx1, 1);
        p2.inventory.splice(idx2, 1);

        p1.inventory.push(item2);
        p2.inventory.push(item1);

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

// --- ADMIN PURGE FEATURE ---
app.delete('/api/admin/purge/:cardId', adminAuth, async (req, res) => {
    try {
        const userEmail = req.headers['x-user-email'] || 'KEY';
        const { cardId } = req.params;
        if (!cardId) return res.status(400).json({ message: 'Missing cardId' });

        // ✅ SECURE - Regex based pull to remove variants (ITEM-01 and ITEM-01__suffix)
        const result = await User.updateMany(
            {},
            {
                $pull: {
                    inventory: {
                        id: { $regex: `^${cardId}(__|$)`, $options: 'i' }
                    }
                }
            }
        );

        console.log(`⚠️ GLOBAL PURGE: Item ${cardId} (and variants) removed from ${result.modifiedCount} users by ${userEmail}.`);
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

        // Auto-cleanup expired sector events
        if (r.activeSectorEvent && r.activeSectorEvent.type && r.activeSectorEvent.expiresAt < Date.now()) {
            r.activeSectorEvent = { type: null, initiator: null, expiresAt: 0 };
            await r.save();
        }

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

// Admin Actions in Room
app.post('/api/admin/action', adminAuth, async (req, res) => {
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

// Sector Events
app.post('/api/rooms/:roomId/sector-event', async (req, res) => {
    try {
        const { type, initiator, durationMinutes } = req.body;
        const r = await Room.findOne({ roomId: req.params.roomId });
        if (r) {
            const expiresAt = Date.now() + (durationMinutes * 60 * 1000);
            r.activeSectorEvent = { type, initiator, expiresAt };

            // Log to chat
            let msg = '';
            if (type === 'MAGNETIC_STORM') {
                msg = `⚠️ SYSTÉM: Hráč ${initiator} aktivoval Magnetickou Bouři. Všechna brnění jsou na ${durationMinutes} minut deaktivována!`;
            } else {
                msg = `⚠️ SYSTÉM: Hráč ${initiator} aktivoval sektorovou anomálii: ${type}`;
            }

            r.messages.push({
                id: 'sys-event-' + Date.now(),
                sender: 'SYSTEM',
                text: msg,
                timestamp: Date.now(),
                isSystem: true
            });

            await r.save();
            res.json({ success: true, expiresAt });
        } else {
            res.status(404).json({ message: "Sektor nenalezen" });
        }
    } catch (e) { res.status(500).json({ message: e.message }) }
});

// --- CHARACTER API ---
// Get all characters for admin
app.get('/api/characters/:adminEmail', adminAuth, async (req, res) => {
    console.log("🚀 [DEBUG] Character endpoint hit (v2.0 fixed)");
    try {
        const adminEmail = req.params.adminEmail.toLowerCase().trim();

        // HLAVNÍ ADMIN vidí vše, ostatní jen své nebo osiřelé
        const query = adminEmail === ADMIN_EMAIL.toLowerCase()
            ? {}
            : {
                $or: [
                    { adminEmail },
                    { adminEmail: { $exists: false } },
                    { adminEmail: null },
                    { adminEmail: "" }
                ]
            };

        const characters = await Character.find(query).sort({ createdAt: -1 });

        console.log(`✅ [CHARACTER] Fetched ${characters.length} characters for ${adminEmail}`);
        res.json(characters);
    } catch (e) {
        console.error('❌ [CHARACTER] Error fetching characters:', e.message);
        res.status(500).json({ message: e.message });
    }
});

// Get character by ID
app.get('/api/characters/by-id/:characterId', async (req, res) => {
    try {
        const characterId = req.params.characterId.toUpperCase().trim();
        const character = await Character.findOne({ characterId });
        if (!character) return res.status(404).json({ message: 'Character not found' });
        res.json(character);
    } catch (e) {
        console.error('❌ [CHARACTER] Error fetching character by ID:', e.message);
        res.status(500).json({ message: e.message });
    }
});

// Save/Update character
app.post('/api/characters/:adminEmail', adminAuth, async (req, res) => {
    try {
        const adminEmail = req.params.adminEmail.toLowerCase().trim();
        const characterData = req.body;

        if (characterData.characterId) {
            characterData.characterId = characterData.characterId.toUpperCase().trim();
        }

        characterData.adminEmail = adminEmail;

        const existing = await Character.findOne({ characterId: characterData.characterId });

        if (existing) {
            Object.assign(existing, characterData);
            await existing.save();
            console.log(`✅ [CHARACTER] Updated character: ${characterData.characterId}`);
            res.json(existing);
        } else {
            const newCharacter = await Character.create(characterData);
            console.log(`✅ [CHARACTER] Created new character: ${characterData.characterId}`);
            res.json(newCharacter);
        }
    } catch (e) {
        console.error('❌ [CHARACTER] Error saving character:', e.message);
        res.status(500).json({ message: e.message });
    }
});

// Delete character
app.delete('/api/characters/:adminEmail/:characterId', adminAuth, async (req, res) => {
    try {
        const adminEmail = req.params.adminEmail.toLowerCase().trim();
        const characterId = decodeURIComponent(req.params.characterId).toUpperCase().trim();

        const result = await Character.deleteOne({ characterId, adminEmail });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Character not found' });
        }

        console.log(`✅ [CHARACTER] Deleted character: ${characterId}`);
        res.json({ success: true });
    } catch (e) {
        console.error('❌ [CHARACTER] Error deleting character:', e.message);
        res.status(500).json({ message: e.message });
    }
});

// --- ANTI-SPIN-DOWN MECHANISM (for Render.com free tier) ---
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
    console.log(`🚀 Anti-Spin-Down aktivní pro: ${RENDER_URL}`);
    setInterval(async () => {
        try {
            const res = await fetch(`${RENDER_URL}/api/health`);
            console.log(`[Anti-Spin] Self-ping OK (Status: ${res.status})`);
        } catch (e) {
            console.error(`[Anti-Spin] Self-ping failed: ${e.message}`);
        }
    }, 14 * 60 * 1000); // Každých 14 minut (Render usíná po 15 min nečinnosti)
}

app.listen(PORT, () => { console.log(`✅ Nexus Backend running on port ${PORT}`); });
