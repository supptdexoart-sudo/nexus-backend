import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '../logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const SECURITY_LOG_PATH = path.join(LOG_DIR, 'security.log');
const APP_LOG_PATH = path.join(LOG_DIR, 'app.log');

// Custom Formatter
const logFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}`;
});

// 1. SECURITY LOGGER (Retence: 1 týden - maže se v Pondělí)
const securityLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        new winston.transports.File({ filename: SECURITY_LOG_PATH }),
        new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })
    ]
});

// 2. APP LOGGER (Retence: 5 minut)
const appLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        new winston.transports.File({ filename: APP_LOG_PATH }),
        new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })
    ]
});

// --- CLEANUP JOBS ---

// Cleanup pro App Logy (každých 5 minut)
setInterval(() => {
    try {
        fs.writeFileSync(APP_LOG_PATH, ''); // Truncate file (smaže obsah)
        // console.log('🧹 [LOG CLEANUP] App logs cleared (5 min interval).');
    } catch (e) {
        console.error('❌ [LOG CLEANUP] Failed to clear app logs:', e);
    }
}, 5 * 60 * 1000);

// Cleanup pro Security Logy (Každé Pondělí v 00:01)
// Kontrola běží každou minutu
setInterval(() => {
    const now = new Date();
    // 1 = Pondělí, 0 hod, 1 min
    if (now.getDay() === 1 && now.getHours() === 0 && now.getMinutes() === 1) {
        try {
            fs.writeFileSync(SECURITY_LOG_PATH, '');
            console.log('🧹 [SECURITY CLEANUP] Security logs cleared (Weekly schedule).');
        } catch (e) {
            console.error('❌ [SECURITY CLEANUP] Failed to clear security logs:', e);
        }
    }
}, 60 * 1000);


// --- EXPORTS & MIDDLEWARE ---

// Unified logger interface for backward compatibility
const logger = {
    info: (msg, meta) => {
        // Rozhodování kam logovat
        if (isSecurityMsg(msg, meta)) {
            securityLogger.info(msg, meta);
        } else {
            appLogger.info(msg, meta);
        }
    },
    warn: (msg, meta) => {
        if (isSecurityMsg(msg, meta)) {
            securityLogger.warn(msg, meta);
        } else {
            appLogger.warn(msg, meta);
        }
    },
    error: (msg, meta) => {
        // Errors logujeme do obou pro jistotu, nebo jen app
        appLogger.error(msg, meta);
    }
};

const isSecurityMsg = (msg, meta) => {
    const txt = (msg || '').toString().toLowerCase();
    // Keywords identification
    if (txt.includes('security') || txt.includes('auth') || txt.includes('login') || txt.includes('unauthorized')) return true;
    if (meta && meta.path && meta.path.includes('/api/auth')) return true;
    return false;
};

// Audit logging middleware
export const auditLogger = (action) => {
    return (req, res, next) => {
        const userEmail = req.headers['x-user-email'] || 'anonymous';
        const ip = req.ip || req.connection.remoteAddress;

        // Log request
        logger.info(`${action}`, {
            user: userEmail,
            ip: ip,
            method: req.method,
            path: req.path
        });

        next();
    };
};

// Log security events helper
export const logSecurityEvent = (event, details) => {
    securityLogger.warn(`SECURITY: ${event}`, details);
};

// Log authentication helper
export const logAuth = (email, success, ip) => {
    if (success) {
        securityLogger.info('AUTH_SUCCESS', { user: email, ip });
    } else {
        securityLogger.warn('AUTH_FAILED', { user: email, ip });
    }
};

export { logger };
