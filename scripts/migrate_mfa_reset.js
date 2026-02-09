/**
 * Migration: MFA Reset System
 * 
 * Creates tables and columns for:
 * - TOTP (Authenticator App) setup
 * - Telegram OTP password reset
 * - Password reset tokens
 * 
 * Run: node scripts/migrate_mfa_reset.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting MFA Reset Migration...\n');

        // ====================
        // 1. Add MFA columns to admin_users
        // ====================
        console.log('📦 Adding MFA columns to admin_users...');

        await client.query(`
            ALTER TABLE admin_users
            ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
        `);
        console.log('   ✅ totp_enabled column');

        await client.query(`
            ALTER TABLE admin_users
            ADD COLUMN IF NOT EXISTS totp_secret_enc TEXT NULL;
        `);
        console.log('   ✅ totp_secret_enc column');

        await client.query(`
            ALTER TABLE admin_users
            ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN NOT NULL DEFAULT FALSE;
        `);
        console.log('   ✅ telegram_enabled column');

        await client.query(`
            ALTER TABLE admin_users
            ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT NULL;
        `);
        console.log('   ✅ telegram_chat_id column');

        // ====================
        // 2. Create Telegram OTP table
        // ====================
        console.log('\n📦 Creating auth.telegram_reset_otps table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS auth.telegram_reset_otps (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                otp_hash TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP NULL,
                attempts INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT now(),
                requested_ip VARCHAR(45) NULL,
                user_agent TEXT NULL
            );
        `);
        console.log('   ✅ Table created');

        await client.query(`
            CREATE INDEX IF NOT EXISTS telegram_reset_otps_expires_idx 
            ON auth.telegram_reset_otps(expires_at);
        `);
        console.log('   ✅ Index on expires_at');

        // ====================
        // 3. Create/Update Password Reset Tokens table
        // ====================
        console.log('\n📦 Ensuring auth.password_reset_tokens table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                token_hash TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP NULL,
                created_at TIMESTAMP NOT NULL DEFAULT now(),
                requested_ip VARCHAR(45) NULL,
                user_agent TEXT NULL
            );
        `);
        console.log('   ✅ Table created/verified');

        await client.query(`
            CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_idx 
            ON auth.password_reset_tokens(expires_at);
        `);
        console.log('   ✅ Index on expires_at');

        // ====================
        // 4. Cleanup old expired records (maintenance)
        // ====================
        console.log('\n🧹 Cleaning up expired records...');

        const otpCleanup = await client.query(`
            DELETE FROM auth.telegram_reset_otps 
            WHERE expires_at < now() - INTERVAL '1 day'
        `);
        console.log(`   ✅ Removed ${otpCleanup.rowCount} expired OTPs`);

        const tokenCleanup = await client.query(`
            DELETE FROM auth.password_reset_tokens 
            WHERE expires_at < now() - INTERVAL '1 day'
        `);
        console.log(`   ✅ Removed ${tokenCleanup.rowCount} expired reset tokens`);

        // ====================
        // 5. Verify admin_users structure
        // ====================
        console.log('\n📋 Current admin_users columns:');
        const cols = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'admin_users'
            ORDER BY ordinal_position;
        `);
        cols.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'required'})`);
        });

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
