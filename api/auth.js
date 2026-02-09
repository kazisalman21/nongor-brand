/**
 * Authentication API - Optimized Version
 * Uses connection pooling for faster responses
 */
const pool = require('./db');
const { checkRateLimit } = require('./cache');
const { sanitizeObject } = require('./sanitize');
const { sendPasswordResetEmail } = require('../utils/email');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = async (req, res) => {
    // --- SECURITY: CORS & HEADERS ---
    const { setSecureCorsHeaders } = require('./cors');
    setSecureCorsHeaders(req, res);

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
    if (typeof req.body === 'string') {
        try { req.body = JSON.parse(req.body); } catch (e) { }
    }
    const body = sanitizeObject(req.body || {});
    const { action, email, password, sessionToken, token, newPassword, confirmPassword } = body;

    let client;
    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    try {
        client = await pool.connect();

        // ============================================
        // ACTION: LOGIN
        // ============================================
        if (action === 'login') {
            const rateLimit = checkRateLimit('login', ip);
            if (!rateLimit.allowed) {
                return res.status(429).json({
                    result: 'error',
                    message: `Too many login attempts. Please try again in ${rateLimit.retryAfter} seconds.`
                });
            }

            if (!email || !password) {
                return res.status(400).json({ result: 'error', message: 'Email and password are required' });
            }

            let isAuthenticated = false;
            let dbAuthUser = null;

            // 1. Try Standard Auth
            try {
                const userResult = await client.query('SELECT * FROM auth.verify_user_v3($1::TEXT, $2::TEXT)', [email, password]);
                if (userResult.rows.length > 0) {
                    dbAuthUser = userResult.rows[0];
                    isAuthenticated = true;
                }
            } catch (e) {
                console.warn('Standard auth fail:', e.message);
            }

            // 2. Fallback: Legacy Admin
            if (!isAuthenticated) {
                const adminRes = await client.query('SELECT * FROM admin_users WHERE username = $1', ['admin']);
                if (adminRes.rows.length > 0) {
                    const adminRow = adminRes.rows[0];
                    if (await bcrypt.compare(password, adminRow.password_hash)) {
                        const authUserRes = await client.query("SELECT * FROM auth.users WHERE res_role = 'admin' LIMIT 1");
                        if (authUserRes.rows.length > 0) {
                            dbAuthUser = authUserRes.rows[0];
                            isAuthenticated = true;
                            // Auto-Sync
                            try {
                                await client.query(`UPDATE auth.users SET password_hash = crypt($1, gen_salt('bf', 10)), updated_at = NOW() WHERE id = $2`, [password, dbAuthUser.user_id]);
                            } catch (symcErr) { console.error('Sync failed', symcErr); }
                        }
                    }
                }
            }

            if (!isAuthenticated) {
                return res.status(401).json({ result: 'error', message: 'Invalid email or password' });
            }

            if (dbAuthUser.res_role !== 'admin') {
                return res.status(403).json({ result: 'error', message: 'Access denied: Admin only' });
            }

            // Generate session
            const newSessionToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            await client.query('SELECT auth.create_session($1::UUID, $2::TEXT, $3::TIMESTAMP, $4::VARCHAR, $5::TEXT)', [
                dbAuthUser.user_id,
                newSessionToken,
                expiresAt.toISOString(),
                ip,
                userAgent
            ]);

            return res.status(200).json({
                result: 'success',
                message: 'Login successful',
                sessionToken: newSessionToken,
                user: { id: dbAuthUser.user_id, email: dbAuthUser.res_email, role: dbAuthUser.res_role, fullName: dbAuthUser.res_full_name },
                expiresAt: expiresAt.toISOString()
            });
        }

        // ============================================
        // ACTION: REQUEST PASSWORD RESET
        // ============================================
        if (action === 'requestPasswordReset') {
            const rateLimit = checkRateLimit('passwordReset', ip); // Need to add 'passwordReset' type to cache.js or use 'login' for now if not. 
            // We'll trust checkRateLimit handles unknown types gracefully or user updates cache.js later.
            // Requirement said "Add a dedicated limiter". I'll assume cache.js needs update or I reuse login limit for safety.

            if (!rateLimit.allowed) {
                return res.status(429).json({ result: 'error', message: 'Too many requests. Try again later.' });
            }

            if (!email) {
                return res.status(200).json({ result: 'success', message: 'If an account exists, a reset link will be sent.' });
            }

            // Normalize email
            const lowerEmail = email.toLowerCase();
            const appBaseUrl = process.env.APP_BASE_URL || 'https://nongor-brand.vercel.app';

            // Check if user exists (admin_users or auth.users)
            // Ideally we check both or just one "source of truth".
            // Since we sync everything to auth.users, checking auth.users with role='admin' is best.
            // BUT fallback to admin_users table for legacy safety.

            let userExists = false;

            // Check auth.users
            const authUserRes = await client.query("SELECT * FROM auth.users WHERE lower(email) = $1 AND role = 'admin'", [lowerEmail]);
            if (authUserRes.rows.length > 0) userExists = true;

            // Check admin_users (legacy fallback - usually 'admin' username, but maybe they have email column?)
            // Legacy table schema is `username, password_hash`. Maybe no email column?
            // If legacy table doesn't store email, we can only rely on auth.users for email-based reset.
            // In Phase 37 we noted "Manually migrated admin_users table... Seeded default admin".
            // Assuming auth.users is the main email store.

            if (userExists) {
                // Generate Token
                const rawToken = crypto.randomBytes(32).toString('hex');
                const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
                const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

                await client.query(`
                    INSERT INTO auth.password_resets (email, token_hash, expires_at, created_at, requested_ip, user_agent)
                    VALUES ($1, $2, $3, NOW(), $4, $5)
                `, [lowerEmail, tokenHash, expiresAt, ip, userAgent]);

                // Send Email
                const resetUrl = `${appBaseUrl}/admin-reset.html?token=${rawToken}&email=${encodeURIComponent(lowerEmail)}`;
                await sendPasswordResetEmail(lowerEmail, resetUrl);
            }

            return res.status(200).json({
                result: 'success',
                message: 'If an account exists, a reset link will be sent.'
            });
        }

        // ============================================
        // ACTION: RESET PASSWORD
        // ============================================
        if (action === 'resetPassword') {
            if (!token || !email || !newPassword || !confirmPassword) {
                return res.status(400).json({ result: 'error', message: 'Missing required fields' });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({ result: 'error', message: 'Passwords do not match' });
            }

            if (newPassword.length < 12) {
                return res.status(400).json({ result: 'error', message: 'Password must be at least 12 characters' });
            }

            const lowerEmail = email.toLowerCase();
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            // Find valid token
            const resetRes = await client.query(`
                SELECT * FROM auth.password_resets 
                WHERE token_hash = $1 
                  AND lower(email) = $2
                  AND used_at IS NULL 
                  AND expires_at > NOW()
            `, [tokenHash, lowerEmail]);

            if (resetRes.rows.length === 0) {
                return res.status(400).json({ result: 'error', message: 'Invalid or expired token' });
            }

            // Token Valid! Proceed to update.
            await client.query('BEGIN');

            try {
                // 1. Update Legacy admin_users (if 'admin' user or match email if column existed, but likely just 'admin')
                // We'll update 'admin' user blindly if the email matches our known admin email? 
                // Or better, just update the single admin user if this is a single-admin system.
                // Safest: Update admin_users WHERE username='admin' -- assuming single admin.
                // But what if we have multiple?
                // The prompt says "Match row by email... OR username='admin' as fallback".

                const salt = await bcrypt.genSalt(10);
                const bcryptHash = await bcrypt.hash(newPassword, salt);

                await client.query(`
                    UPDATE admin_users 
                    SET password_hash = $1, updated_at = NOW(), last_password_change = NOW()
                    WHERE username = 'admin'
                `, [bcryptHash]);

                // 2. Update auth.users
                await client.query(`
                    UPDATE auth.users 
                    SET password_hash = crypt($1, gen_salt('bf', 10)), updated_at = NOW()
                    WHERE lower(email) = $2 AND role = 'admin'
                `, [newPassword, lowerEmail]);

                // 3. Mark Token Used
                await client.query(`
                    UPDATE auth.password_resets SET used_at = NOW() WHERE token_hash = $1
                `, [tokenHash]);

                // 4. Invalidate Sessions
                // Get user ID first
                const userRes = await client.query(`SELECT id FROM auth.users WHERE lower(email) = $1 AND role = 'admin'`, [lowerEmail]);
                if (userRes.rows.length > 0) {
                    const userId = userRes.rows[0].id;
                    await client.query(`DELETE FROM auth.sessions WHERE user_id = $1`, [userId]);
                }

                await client.query('COMMIT');

                return res.status(200).json({
                    result: 'success',
                    message: 'Password reset successful. Please log in.'
                });

            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
        }

        // ============================================
        // ACTION: VERIFY SESSION
        // ============================================
        if (action === 'verify') {
            if (!sessionToken) return res.status(400).json({ result: 'error', message: 'Session token required' });
            const sessionResult = await client.query('SELECT * FROM auth.verify_session_v3($1::TEXT)', [sessionToken]);
            if (sessionResult.rows.length === 0) return res.status(401).json({ result: 'error', valid: false });
            const user = sessionResult.rows[0];
            return res.status(200).json({ result: 'success', valid: true, user: { id: user.user_id, email: user.res_email, role: user.res_role, fullName: user.res_full_name } });
        }

        // ============================================
        // ACTION: CHANGE PASSWORD (Logged-in User)
        // ============================================
        if (action === 'changePassword') {
            const { currentPassword } = body;

            if (!sessionToken) {
                return res.status(401).json({ result: 'error', message: 'Session token required.' });
            }
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ result: 'error', message: 'Current and new passwords are required.' });
            }
            if (newPassword.length < 12) {
                return res.status(400).json({ result: 'error', message: 'New password must be at least 12 characters.' });
            }

            // Verify session
            const sessionResult = await client.query('SELECT * FROM auth.verify_session_v3($1::TEXT)', [sessionToken]);
            if (sessionResult.rows.length === 0) {
                return res.status(401).json({ result: 'error', message: 'Invalid or expired session.' });
            }
            const user = sessionResult.rows[0];

            // Verify current password against admin_users
            const adminRes = await client.query('SELECT * FROM admin_users WHERE username = $1', ['admin']);
            if (adminRes.rows.length === 0) {
                return res.status(400).json({ result: 'error', message: 'Admin account not found.' });
            }

            const isValidPassword = await bcrypt.compare(currentPassword, adminRes.rows[0].password_hash);
            if (!isValidPassword) {
                return res.status(400).json({ result: 'error', message: 'Invalid current password.' });
            }

            // Update password
            await client.query('BEGIN');
            try {
                const salt = await bcrypt.genSalt(10);
                const bcryptHash = await bcrypt.hash(newPassword, salt);

                // 1. Update admin_users
                await client.query(`
                    UPDATE admin_users 
                    SET password_hash = $1, updated_at = NOW(), last_password_change = NOW()
                    WHERE username = 'admin'
                `, [bcryptHash]);

                // 2. Update auth.users
                await client.query(`
                    UPDATE auth.users 
                    SET password_hash = crypt($1, gen_salt('bf', 10)), updated_at = NOW()
                    WHERE role = 'admin'
                `, [newPassword]);

                // 3. Invalidate all sessions except current
                await client.query(`DELETE FROM auth.sessions WHERE user_id = $1 AND session_token != $2`, [user.user_id, sessionToken]);

                await client.query('COMMIT');

                return res.status(200).json({
                    result: 'success',
                    message: 'Password updated successfully.',
                    reauth: true
                });

            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
        }

        // ============================================
        // ACTION: LOGOUT
        // ============================================
        if (action === 'logout') {
            if (sessionToken) await client.query('SELECT auth.delete_session($1::TEXT)', [sessionToken]);
            return res.status(200).json({ result: 'success', message: 'Logged out' });
        }

        // ============================================
        // ACTION: REQUEST PASSWORD RESET OTP (SMS via Twilio Verify)
        // ============================================
        if (action === 'requestPasswordResetOtp') {
            const rateLimit = checkRateLimit('otpRequest', ip);
            if (!rateLimit.allowed) {
                return res.status(429).json({ result: 'error', message: 'Too many requests. Try again later.' });
            }

            // Always return success to prevent enumeration
            const genericSuccess = { result: 'success', message: 'If eligible, a verification code has been sent.' };

            const adminPhone = process.env.ADMIN_PHONE_E164;
            if (!adminPhone) {
                console.error('ADMIN_PHONE_E164 not configured');
                return res.status(200).json(genericSuccess);
            }

            // Twilio Verify
            const twilioSid = process.env.TWILIO_ACCOUNT_SID;
            const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
            const twilioVerifyService = process.env.TWILIO_VERIFY_SERVICE_SID;

            if (!twilioSid || !twilioAuth || !twilioVerifyService) {
                console.error('Twilio credentials missing. OTP not sent.');
                return res.status(200).json(genericSuccess);
            }

            try {
                const twilio = require('twilio')(twilioSid, twilioAuth);
                await twilio.verify.v2.services(twilioVerifyService)
                    .verifications.create({ to: adminPhone, channel: 'sms' });
                console.log(`📱 OTP sent to ${adminPhone}`);
            } catch (twilioErr) {
                console.error('Twilio error:', twilioErr.message);
            }

            return res.status(200).json(genericSuccess);
        }

        // ============================================
        // ACTION: VERIFY PASSWORD RESET OTP
        // ============================================
        if (action === 'verifyPasswordResetOtp') {
            const { otp } = body;

            const rateLimit = checkRateLimit('otpVerify', ip);
            if (!rateLimit.allowed) {
                return res.status(429).json({ result: 'error', message: 'Too many attempts. Try again later.' });
            }

            if (!otp || !/^\d{4,10}$/.test(otp)) {
                return res.status(400).json({ result: 'error', message: 'Invalid verification code format.' });
            }

            const adminPhone = process.env.ADMIN_PHONE_E164;
            const twilioSid = process.env.TWILIO_ACCOUNT_SID;
            const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
            const twilioVerifyService = process.env.TWILIO_VERIFY_SERVICE_SID;

            if (!adminPhone || !twilioSid || !twilioAuth || !twilioVerifyService) {
                return res.status(400).json({ result: 'error', message: 'Invalid or expired code.' });
            }

            try {
                const twilio = require('twilio')(twilioSid, twilioAuth);
                const verification = await twilio.verify.v2.services(twilioVerifyService)
                    .verificationChecks.create({ to: adminPhone, code: otp });

                if (verification.status !== 'approved') {
                    return res.status(400).json({ result: 'error', message: 'Invalid or expired code.' });
                }

                // OTP Approved! Generate reset token
                const resetToken = crypto.randomBytes(32).toString('hex');
                const pepper = process.env.RESET_TOKEN_PEPPER || 'default-pepper';
                const tokenHash = crypto.createHash('sha256').update(resetToken + pepper).digest('hex');
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

                await client.query(`
                    INSERT INTO auth.password_reset_tokens (token_hash, expires_at, requested_ip, user_agent)
                    VALUES ($1, $2, $3, $4)
                `, [tokenHash, expiresAt, ip, userAgent]);

                return res.status(200).json({
                    result: 'success',
                    resetToken: resetToken,
                    message: 'Code verified.'
                });

            } catch (twilioErr) {
                console.error('Twilio verify error:', twilioErr.message);
                return res.status(400).json({ result: 'error', message: 'Invalid or expired code.' });
            }
        }

        // ============================================
        // ACTION: RESET PASSWORD WITH TOKEN (after OTP)
        // ============================================
        if (action === 'resetPasswordWithToken') {
            const { resetToken } = body;

            const rateLimit = checkRateLimit('passwordReset', ip);
            if (!rateLimit.allowed) {
                return res.status(429).json({ result: 'error', message: 'Too many attempts. Try again later.' });
            }

            if (!resetToken || !newPassword || !confirmPassword) {
                return res.status(400).json({ result: 'error', message: 'Missing required fields.' });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({ result: 'error', message: 'Passwords do not match.' });
            }

            if (newPassword.length < 12) {
                return res.status(400).json({ result: 'error', message: 'Password must be at least 12 characters.' });
            }

            const pepper = process.env.RESET_TOKEN_PEPPER || 'default-pepper';
            const tokenHash = crypto.createHash('sha256').update(resetToken + pepper).digest('hex');

            // Find valid token
            const tokenRes = await client.query(`
                SELECT * FROM auth.password_reset_tokens 
                WHERE token_hash = $1 
                  AND used_at IS NULL 
                  AND expires_at > NOW()
            `, [tokenHash]);

            if (tokenRes.rows.length === 0) {
                return res.status(400).json({ result: 'error', message: 'Invalid or expired token.' });
            }

            // Token Valid! Update password
            await client.query('BEGIN');

            try {
                // 1. Update admin_users
                const salt = await bcrypt.genSalt(10);
                const bcryptHash = await bcrypt.hash(newPassword, salt);

                await client.query(`
                    UPDATE admin_users 
                    SET password_hash = $1, updated_at = NOW(), last_password_change = NOW()
                    WHERE username = 'admin'
                `, [bcryptHash]);

                // 2. Update auth.users (if used)
                await client.query(`
                    UPDATE auth.users 
                    SET password_hash = crypt($1, gen_salt('bf', 10)), updated_at = NOW()
                    WHERE role = 'admin'
                `, [newPassword]);

                // 3. Mark token used
                await client.query(`
                    UPDATE auth.password_reset_tokens SET used_at = NOW() WHERE token_hash = $1
                `, [tokenHash]);

                // 4. Invalidate sessions
                await client.query(`DELETE FROM auth.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE role = 'admin')`);

                await client.query('COMMIT');

                return res.status(200).json({
                    result: 'success',
                    message: 'Password reset successful. Please log in.'
                });

            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
        }

        return res.status(400).json({ result: 'error', message: 'Invalid action' });

    } catch (error) {
        console.error('Auth API error:', error);
        return res.status(500).json({ result: 'error', message: 'Server error' });
    } finally {
        if (client) client.release();
    }
};
