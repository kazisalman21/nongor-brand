/**
 * MIGRATION SCRIPT: Create admin_users table
 * Run with: node scripts/migrate_admin_users.js
 */
require('dotenv').config();
const pool = require('../api/db');
const bcrypt = require('bcryptjs');

async function migrate() {
    let client;
    try {
        console.log('🔌 Connecting to database...');
        client = await pool.connect();

        console.log('🛠️ Creating table "admin_users"...');

        // 1. Create Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT,
                full_name TEXT,
                role TEXT DEFAULT 'admin',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                password_version INTEGER DEFAULT 1
            );
        `);
        console.log('✅ Table "admin_users" ensured.');

        // 2. Helper to hash password
        const password = process.env.ADMIN_PASSWORD || 'TemporaryPass123!';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const username = 'admin';
        const email = 'admin@nongor.com';
        const fullName = 'System Admin';

        console.log(`🔐 Seeding admin user: ${username} / [HIDDEN]...`);

        // 3. Insert Admin User if not exists
        const res = await client.query(`
            INSERT INTO admin_users (username, password_hash, email, full_name, role)
            VALUES ($1, $2, $3, $4, 'admin')
            ON CONFLICT (username) DO UPDATE 
            SET updated_at = NOW() -- Just to verify connection/write
            RETURNING id;
        `, [username, hash, email, fullName]);

        if (res.rowCount > 0) {
            console.log('✅ Admin user inserted/updated successfully.');
        } else {
            console.log('ℹ️ Admin user already exists (No changes).');
        }

        // 4. Verification Check
        const verify = await client.query('SELECT * FROM admin_users WHERE username = $1', [username]);
        console.log('✨ Verification:', verify.rows[0].username, 'ID:', verify.rows[0].id);

    } catch (err) {
        console.error('❌ MIGRATION ERROR:', err);
    } finally {
        if (client) client.release();
        await pool.end();
        console.log('👋 Connection closed.');
    }
}

migrate();
