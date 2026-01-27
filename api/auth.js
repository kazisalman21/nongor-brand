const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { action, password, token } = req.body;

    // LOGIN
    if (action === 'login') {
        try {
            if (!ADMIN_PASSWORD_HASH || !JWT_SECRET) {
                console.error('Missing Env Vars: ADMIN_PASSWORD_HASH or JWT_SECRET');
                return res.status(500).json({ success: false, message: 'Server configuration error' });
            }

            const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid password'
                });
            }

            const authToken = jwt.sign(
                { role: 'admin', timestamp: Date.now() },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.status(200).json({
                success: true,
                token: authToken,
                message: 'Login successful'
            });
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
        }
    }

    // VERIFY
    if (action === 'verify') {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            return res.status(200).json({
                success: true,
                valid: true,
                decoded
            });
        } catch (error) {
            return res.status(401).json({
                success: false,
                valid: false,
                message: 'Invalid or expired token'
            });
        }
    }

    return res.status(400).json({
        success: false,
        message: 'Invalid action'
    });
};
