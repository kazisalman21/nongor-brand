const { Client } = require('pg');

// Initialize DB connection string
const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });
    }

    const { action, email, password, sessionToken } = req.body;

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // ============================================
        // ACTION: LOGIN
        // ============================================
        if (action === 'login') {
            // Validate input
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            // Verify user credentials
            const userResult = await client.query('SELECT * FROM auth.verify_user_v2($1::TEXT, $2::TEXT)', [email, password]);

            if (userResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const user = userResult.rows[0];

            // Check if user is admin
            if (user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Admin only'
                });
            }

            // Generate session token
            const newSessionToken = generateSecureToken();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Get IP and User Agent
            const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'] || '';

            // Create session
            await client.query('SELECT auth.create_session($1::UUID, $2::TEXT, $3::TIMESTAMP, $4::VARCHAR, $5::TEXT)', [
                user.user_id,
                newSessionToken,
                expiresAt.toISOString(),
                ipAddress,
                userAgent
            ]);

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                sessionToken: newSessionToken,
                user: {
                    id: user.user_id,
                    email: user.email,
                    role: user.role,
                    fullName: user.full_name
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
                    success: false,
                    message: 'Session token is required'
                });
            }

            // Verify session
            const sessionResult = await client.query('SELECT * FROM auth.verify_session_v2($1::TEXT)', [sessionToken]);

            if (sessionResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    valid: false,
                    message: 'Invalid or expired session'
                });
            }

            const user = sessionResult.rows[0];

            return res.status(200).json({
                success: true,
                valid: true,
                user: {
                    id: user.user_id,
                    email: user.email,
                    role: user.role,
                    fullName: user.full_name
                }
            });
        }

        // ============================================
        // ACTION: LOGOUT
        // ============================================
        if (action === 'logout') {
            if (!sessionToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Session token is required'
                });
            }

            // Delete session
            await client.query('SELECT auth.delete_session($1::TEXT)', [sessionToken]);

            return res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });
        }

        // ============================================
        // ACTION: CHANGE PASSWORD
        // ============================================
        if (action === 'changePassword') {
            const { currentPassword, newPassword } = req.body;

            if (!sessionToken || !currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Verify session first
            const sessionResult = await client.query('SELECT * FROM auth.verify_session_v2($1::TEXT)', [sessionToken]);

            if (sessionResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid session'
                });
            }

            const user = sessionResult.rows[0];

            // Verify current password - use user.email because V2 returns 'email'
            const verifyResult = await client.query('SELECT * FROM auth.verify_user_v2($1::TEXT, $2::TEXT)', [user.email, currentPassword]);

            if (verifyResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
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
                success: true,
                message: 'Password changed successfully'
            });
        }

        // Unknown action
        return res.status(400).json({
            success: false,
            message: 'Invalid action'
        });

    } catch (error) {
        console.error('Auth API error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    } finally {
        await client.end();
    }
};

// Helper function to generate secure token
function generateSecureToken() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
}
