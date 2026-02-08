require('dotenv').config();
const pool = require('../api/db');
const bcrypt = require('bcryptjs');

async function migrate() {
    let client;
    try {
        console.log('🔌 Connecting to database...');
        client = await pool.connect();

        console.log('🛠️ Creating admin_users table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                last_password_change TIMESTAMP DEFAULT NOW(),
                password_version INT NOT NULL DEFAULT 1
            );
        `);
        console.log('✅ admin_users table created/verified.');

        // Seed Admin User
        const adminUsername = 'admin';
        // Use environment variable or default (but log warning if default)
        const initialPassword = process.env.ADMIN_PASSWORD;

        if (!initialPassword) {
            console.warn('⚠️ ADMIN_PASSWORD not found in env. Skipping seed. Please set ADMIN_PASSWORD to seed the initial user.');
        } else {
            console.log(`🌱 Checking for admin user '${adminUsername}'...`);
            const res = await client.query('SELECT * FROM admin_users WHERE username = $1', [adminUsername]);

            if (res.rows.length === 0) {
                console.log(`✨ Seeding admin user...`);
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(initialPassword, salt);

                await client.query(`
                    INSERT INTO admin_users (username, password_hash)
                    VALUES ($1, $2)
                `, [adminUsername, hash]);
                console.log('✅ Admin user seeded successfully.');
            } else {
                console.log('ℹ️ Admin user already exists. Skipping seed.');
            }
        }

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        if (client) client.release();
        await pool.end(); // Close pool to exit script
    }
}

migrate();
