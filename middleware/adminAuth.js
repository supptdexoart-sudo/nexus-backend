
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'zbynekbal97@gmail.com';

export const adminAuth = (req, res, next) => {
    // ✅ SECURE - Read adminToken from HttpOnly cookie
    const adminKey = req.cookies.adminToken || req.headers['x-admin-key']; // Fallback na header pro přechodné období
    const userEmail = req.headers['x-user-email'];
    const adminPassword = process.env.ADMIN_PASSWORD;

    // ✅ SECURE - Require BOTH password AND email match (AND logic)
    // This prevents bypassing authentication with just one credential
    const hasValidPassword = adminKey && adminKey === adminPassword;
    const hasValidEmail = userEmail && userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const isAuthorized = hasValidPassword && hasValidEmail;

    if (!isAuthorized) {
        console.warn(`[SECURITY] Unauthorized admin access attempt from ${userEmail || 'unknown'}`);
        return res.status(403).json({
            message: 'Odepřen přístup: Tato akce vyžaduje administrátorská oprávnění.'
        });
    }

    next();
};
