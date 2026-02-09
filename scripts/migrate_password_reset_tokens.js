/**
 * Migration: Create Password Reset Tokens Table
 * Stores hashed reset tokens issued after OTP verification
 */
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL is missing!');
    process.exit(1);
}

// Fix SSL for Vercel/Neon
let finalConnectionString = connectionString;
if (!connectionString.includes('sslmode=')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    finalConnectionString += `${separator}sslmode=require`;
}

const pool = new Pool({
    connectionString: finalConnectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Creating auth.password_reset_tokens table...');

        await client.query('BEGIN');

        // Create Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                requested_ip VARCHAR(45) NULL,
                user_agent TEXT NULL
            );
        `);

        // Create Indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON auth.password_reset_tokens(token_hash);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON auth.password_reset_tokens(expires_at);
        `);

        await client.query('COMMIT');
        console.log('✅ Success: auth.password_reset_tokens table created!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
