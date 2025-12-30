import { logSecurityEvent } from './auditLogger.js';

// Session storage (in-memory for now, could be Redis in production)
const sessions = new Map();

// Session timeout: 30 minutes
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

// Cleanup interval: every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Session structure: { email, lastActivity, ip }

// Update session activity
const updateSession = (email, ip) => {
    sessions.set(email, {
        email,
        lastActivity: Date.now(),
        ip
    });
};

// Check if session is valid
const isSessionValid = (email) => {
    const session = sessions.get(email);
    if (!session) return false;

    const now = Date.now();
    const timeSinceActivity = now - session.lastActivity;

    return timeSinceActivity < SESSION_TIMEOUT;
};

// Remove expired session
const removeSession = (email) => {
    sessions.delete(email);
    logSecurityEvent('SESSION_EXPIRED', { user: email });
};

// Session middleware
export const sessionManager = (req, res, next) => {
    const userEmail = req.headers['x-user-email'];

    if (!userEmail) {
        return res.status(401).json({ error: 'No user email provided' });
    }

    // Check if session exists and is valid
    if (!isSessionValid(userEmail)) {
        removeSession(userEmail);
        return res.status(401).json({
            error: 'Session expired',
            message: 'Vaše relace vypršela po 30 minutách nečinnosti. Přihlaste se prosím znovu.'
        });
    }

    // Update session activity
    const ip = req.ip || req.connection.remoteAddress;
    updateSession(userEmail, ip);

    next();
};

// Create new session (call after successful login)
export const createSession = (email, ip) => {
    updateSession(email, ip);
    logSecurityEvent('SESSION_CREATED', { user: email, ip });
};

// Destroy session (call on logout)
export const destroySession = (email) => {
    sessions.delete(email);
    logSecurityEvent('SESSION_DESTROYED', { user: email });
};

// Cleanup expired sessions periodically
setInterval(() => {
    const now = Date.now();
    let expiredCount = 0;

    for (const [email, session] of sessions.entries()) {
        const timeSinceActivity = now - session.lastActivity;
        if (timeSinceActivity >= SESSION_TIMEOUT) {
            removeSession(email);
            expiredCount++;
        }
    }

    if (expiredCount > 0) {
        console.log(`[SessionManager] Cleaned up ${expiredCount} expired sessions`);
    }
}, CLEANUP_INTERVAL);

export { isSessionValid };
