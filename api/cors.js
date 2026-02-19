/**
 * SECURITY: Proper CORS Configuration
 * Centralized CORS logic for valid origins and security headers
 */

// ============================================
// Allowed Origins Configuration
// ============================================
const allowedOrigins = [
    'https://www.nongorr.com',
    'https://nongorr.com',
    // Add development origins only in development
    ...(process.env.NODE_ENV === 'development' ? [
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5500' // Added VSCode Live Server default
    ] : [])
];

/**
 * Validates if an origin is allowed
 * Supports exact matches and Vercel preview URLs in non-production
 */
function isOriginAllowed(origin) {
    // Allow exact matches
    if (allowedOrigins.includes(origin)) {
        return true;
    }

    // Allow Vercel preview deployments (e.g., nongor-brand-abc123.vercel.app)
    // Only in non-production environments to prevent abuse
    if (process.env.NODE_ENV !== 'production') {
        const vercelPreviewPattern = /^https:\/\/nongor-brand-[a-z0-9-]+\.vercel\.app$/;
        if (vercelPreviewPattern.test(origin)) {
            return true;
        }
    }

    return false;
}

/**
 * Sets Secure CORS Headers on the response object
 * @param {object} req - Express/Node request object
 * @param {object} res - Express/Node response object
 */
function setSecureCorsHeaders(req, res) {
    const origin = req.headers.origin;

    if (origin && isOriginAllowed(origin)) {
        // Origin is whitelisted - allow it with credentials
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
        // No origin header (direct API access or same-origin)
        // Allow from main domain as fallback
        res.setHeader('Access-Control-Allow-Origin', 'https://www.nongorr.com');
    } else {
        // Origin not whitelisted - block it (visually) or restrict
        console.warn(`⚠️ Blocked CORS request from unauthorized origin: ${origin}`);
        // We set a valid origin to prevent browser parsing errors, but credentials won't be sent
        // preventing the attack.
        res.setHeader('Access-Control-Allow-Origin', 'https://www.nongorr.com');
    }

    // Set other CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-token, x-admin-password, x-admin-user, x-admin-pass, x-admin-secret');
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

    // Security headers (Bonus)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

module.exports = {
    setSecureCorsHeaders,
    isOriginAllowed,
    allowedOrigins
};
