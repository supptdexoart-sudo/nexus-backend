import { body, param, validationResult } from 'express-validator';
import { logSecurityEvent } from './auditLogger.js';

// Validation rules for different endpoints
export const validationRules = {
    // Item validation
    createItem: [
        body('id').trim().isLength({ min: 1, max: 100 }).escape(),
        body('title').trim().isLength({ min: 1, max: 200 }).escape(),
        body('description').optional().trim().isLength({ max: 1000 }).escape(),
        body('type').trim().isIn(['ITEM', 'PŘEDMĚT', 'ENCOUNTER', 'BOSS', 'MERCHANT', 'TRAP', 'DILEMA', 'SPACE_STATION', 'PLANET']),
        body('rarity').optional().trim().isIn(['Common', 'Rare', 'Epic', 'Legendary']),
        body('price').optional().isInt({ min: 0, max: 999999 }),
        body('isConsumable').optional().isBoolean(),
        body('isSellOnly').optional().isBoolean()
    ],

    // Email validation
    email: [
        body('email').isEmail().normalizeEmail().withMessage('Invalid email format')
    ],

    // ID parameter validation
    itemId: [
        param('id').trim().isLength({ min: 1, max: 100 }).escape()
    ],

    // Inventory update validation
    updateInventory: [
        body('*.id').trim().isLength({ min: 1, max: 100 }).escape(),
        body('*.quantity').optional().isInt({ min: 0, max: 9999 })
    ],

    // Room validation
    createRoom: [
        body('roomCode').trim().isLength({ min: 4, max: 20 }).isAlphanumeric().toUpperCase(),
        body('maxPlayers').optional().isInt({ min: 1, max: 10 })
    ],

    // Character validation
    createCharacter: [
        body('name').trim().isLength({ min: 1, max: 100 }).escape(),
        body('description').optional().trim().isLength({ max: 500 }).escape(),
        body('baseStats.hp').isInt({ min: 1, max: 9999 }),
        body('baseStats.armor').isInt({ min: 0, max: 999 }),
        body('baseStats.damage').isInt({ min: 1, max: 999 })
    ]
};

// Middleware to check validation results
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logSecurityEvent('VALIDATION_FAILED', {
            user: req.headers['x-user-email'] || 'anonymous',
            errors: errors.array(),
            path: req.path
        });
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};
