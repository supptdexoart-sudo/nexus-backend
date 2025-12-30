import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Daily rotate file transport
const fileRotateTransport = new DailyRotateFile({
    filename: path.join(__dirname, '../logs/audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d', // Keep logs for 14 days
    zippedArchive: true, // Compress old logs
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[${timestamp}] [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    )
});

// Console transport for development
const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
    )
});

// Create logger
const logger = winston.createLogger({
    level: 'info',
    transports: [
        fileRotateTransport,
        consoleTransport
    ]
});

// Audit logging middleware
export const auditLogger = (action) => {
    return (req, res, next) => {
        const userEmail = req.headers['x-user-email'] || 'anonymous';
        const ip = req.ip || req.connection.remoteAddress;

        // Log the action
        logger.info(`${action}`, {
            user: userEmail,
            ip: ip,
            method: req.method,
            path: req.path,
            body: req.method !== 'GET' ? req.body : undefined
        });

        // Intercept response to log result
        const originalSend = res.send;
        res.send = function (data) {
            if (res.statusCode >= 400) {
                logger.warn(`${action} FAILED`, {
                    user: userEmail,
                    statusCode: res.statusCode,
                    path: req.path
                });
            }
            originalSend.call(this, data);
        };

        next();
    };
};

// Log security events
export const logSecurityEvent = (event, details) => {
    logger.warn(`SECURITY: ${event}`, details);
};

// Log authentication events
export const logAuth = (email, success, ip) => {
    if (success) {
        logger.info('AUTH_SUCCESS', { user: email, ip });
    } else {
        logger.warn('AUTH_FAILED', { user: email, ip });
    }
};

export { logger };
