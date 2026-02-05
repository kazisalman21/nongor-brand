/**
 * Authentication API - Optimized Version
 * Uses connection pooling for faster responses
 */
const pool = require('./db');
const { checkRateLimit } = require('./cache');
const { sanitizeObject } = require('./sanitize');

module.exports = async (req, res) => {
    // --- SECURITY: CORS & HEADERS ---
    const { setSecureCorsHeaders } = require('./cors');
    setSecureCorsHeaders(req, res);

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            result: 'error',
            message: 'Method not allowed'
        });
    }

    // --- SECURITY: INPUT SANITIZATION ---
    // Parse body if it's a string
    if (typeof req.body === 'string') {
        try { req.body = JSON.parse(req.body); } catch (e) { }
    }
    const body = sanitizeObject(req.body || {});
    // Destructure sanitized body
    const { action, email, password, sessionToken } = body;

    let client;

    try {
        // Get connection from pool (FAST!)
        client = await pool.connect();

        // ============================================
        // ACTION: LOGIN
        // ============================================
        if (action === 'login') {
            // --- SECURITY: RATE LIMITING (Priority 1) ---
            const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
            const rateLimit = checkRateLimit('login', ip);

            if (!rateLimit.allowed) {
                console.warn(`⚠️ Login Rate Limit Exceeded for IP: ${ip}`);
                client.release();
                return res.status(429).json({
                    result: 'error',
                    message: `Too many login attempts. Please try again in ${rateLimit.retryAfter} seconds.`
                });
            }

            // Validate input
            if (!email || !password) {
                client.release();
                return res.status(400).json({
                    result: 'error',
                    message: 'Email and password are required'
                });
            }

            // Verify user credentials
            const userResult = await client.query('SELECT * FROM auth.verify_user_v3($1::TEXT, $2::TEXT)', [email, password]);

            if (userResult.rows.length === 0) {
                return res.status(401).json({
                    result: 'error',
                    message: 'Invalid email or password'
                });
            }

            const user = userResult.rows[0];

            // Check if user is admin
            if (user.res_role !== 'admin') {
                return res.status(403).json({
                    result: 'error',
                    message: 'Access denied: Admin only'
                });
            }

            // Generate session token
            const newSessionToken = generateSecureToken();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Get IP and User Agent
            const userAgent = req.headers['user-agent'] || '';

            // Create session
            await client.query('SELECT auth.create_session($1::UUID, $2::TEXT, $3::TIMESTAMP, $4::VARCHAR, $5::TEXT)', [
                user.user_id,
                newSessionToken,
                expiresAt.toISOString(),
                ip,
                userAgent
            ]);

            return res.status(200).json({
                result: 'success',
                message: 'Login successful',
                sessionToken: newSessionToken,
                user: {
                    id: user.user_id,
                    email: user.res_email,
                    role: user.res_role,
                    fullName: user.res_full_name
                },
                expiresAt: expiresAt.toISOString()
            });
        }

        // ============================================
        // ACTION: VERIFY SESSION
        // ============================================
        if (action === 'verify') {
            if (!sessionToken) {
                return res.status(400).json({
                    result: 'error',
                    message: 'Session token is required'
                });
            }

            // Verify session
            const sessionResult = await client.query('SELECT * FROM auth.verify_session_v3($1::TEXT)', [sessionToken]);

            if (sessionResult.rows.length === 0) {
                return res.status(401).json({
                    result: 'error',
                    valid: false,
                    message: 'Invalid or expired session'
                });
            }

            const user = sessionResult.rows[0];

            return res.status(200).json({
                result: 'success',
                valid: true,
                user: {
                    id: user.user_id,
                    email: user.res_email,
                    role: user.res_role,
                    fullName: user.res_full_name
                }
            });
        }

        // ============================================
        // ACTION: LOGOUT
        // ============================================
        if (action === 'logout') {
            if (!sessionToken) {
                return res.status(400).json({
                    result: 'error',
                    message: 'Session token is required'
                });
            }

            // Delete session
            await client.query('SELECT auth.delete_session($1::TEXT)', [sessionToken]);

            return res.status(200).json({
                result: 'success',
                message: 'Logged out successfully'
            });
        }

        // ============================================
        // ACTION: CHANGE PASSWORD
        // ============================================
        if (action === 'changePassword') {
            // Note: req.body is already sanitized above, so use sanitized `body` const instead
            const { currentPassword, newPassword } = body;

            if (!sessionToken || !currentPassword || !newPassword) {
                return res.status(400).json({
                    result: 'error',
                    message: 'Missing required fields'
                });
            }

            // Verify session first
            const sessionResult = await client.query('SELECT * FROM auth.verify_session_v3($1::TEXT)', [sessionToken]);

            if (sessionResult.rows.length === 0) {
                return res.status(401).json({
                    result: 'error',
                    message: 'Invalid session'
                });
            }

            const user = sessionResult.rows[0];

            // Verify current password
            const verifyResult = await client.query('SELECT * FROM auth.verify_user_v3($1::TEXT, $2::TEXT)', [user.res_email, currentPassword]);

            if (verifyResult.rows.length === 0) {
                return res.status(401).json({
                    result: 'error',
                    message: 'Current password is incorrect'
                });
            }

            // Update password
            await client.query(`
                UPDATE auth.users
                SET password_hash = crypt($1, gen_salt('bf', 10)),
                    updated_at = NOW()
                WHERE id = $2
            `, [newPassword, user.user_id]);

            return res.status(200).json({
                result: 'success',
                message: 'Password changed successfully'
            });
        }

        // Unknown action
        return res.status(400).json({
            result: 'error',
            message: 'Invalid action'
        });

    } catch (error) {
        console.error('Auth API error:', error);
        return res.status(500).json({
            result: 'error',
            message: 'Server error: ' + error.message
        });
    } finally {
        // Always release connection back to pool
        if (client) {
            client.release();
        }
    }
};

// Helper function to generate secure token
function generateSecureToken() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
}
