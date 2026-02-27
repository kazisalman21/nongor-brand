/**
 * Migration: Add Google OAuth + Admin Management columns to admin_users
 * Run: node scripts/migrate_admin_roles.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const DB_URL = process.env.SUPABASE_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

async function migrate() {
    const pool = new Pool({
        connectionString: DB_URL.replace(/sslmode=[^&]*&?/g, '').replace(/channel_binding=[^&]*&?/g, ''),
        ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    try {
        console.log('🔄 Migrating admin_users table...\n');

        // Add new columns
        const alterations = [
            `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin'`,
            `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
            `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)`,
            `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
            `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`,
            `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS invited_by INTEGER`,
            `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ`,
            `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)`,
        ];

        for (const sql of alterations) {
            try {
                await client.query(sql);
                const col = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
                console.log(`  ✅ Column: ${col}`);
            } catch (e) {
                console.log(`  ⚠️  ${e.message}`);
            }
        }

        // Set current admin as super_admin
        await client.query(`UPDATE admin_users SET role = 'super_admin' WHERE username = 'admin'`);
        await client.query(`UPDATE admin_users SET email = 'admin@nongor.com' WHERE username = 'admin' AND email IS NULL`);
        await client.query(`UPDATE admin_users SET display_name = 'Admin User' WHERE username = 'admin' AND display_name IS NULL`);
        console.log('\n  ✅ Set current admin as super_admin');

        // Create unique index on google_id
        try {
            await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_google_id ON admin_users(google_id) WHERE google_id IS NOT NULL`);
            console.log('  ✅ Index: google_id');
        } catch (e) { console.log(`  ⚠️  ${e.message}`); }

        // Create unique index on email
        try {
            await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email) WHERE email IS NOT NULL`);
            console.log('  ✅ Index: email');
        } catch (e) { console.log(`  ⚠️  ${e.message}`); }

        // Show final table
        const result = await client.query(`SELECT id, username, email, role, status, display_name FROM admin_users ORDER BY id`);
        console.log('\n📋 Current admin_users:');
        console.table(result.rows);

        console.log('\n✅ Migration complete!');
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(e => { console.error('❌ Migration failed:', e.message); process.exit(1); });
