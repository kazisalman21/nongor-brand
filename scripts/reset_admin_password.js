const { Client } = require('pg');

// Hardcoded connection string to avoid dotenv issues in manual run
const connectionString = "postgresql://neondb_owner:npg_aXlrxhuS9GR8@ep-plain-art-aez29oyf-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function reset() {
    try {
        console.log('Connecting to Neon DB...');
        await client.connect();
        console.log('Connected successfully.');

        const password = 'TemporaryPass123!';
        const email = 'admin@nongor.com';

        // Ensure schema/extension exists
        await client.query('CREATE SCHEMA IF NOT EXISTS auth');
        await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

        // Ensure table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS auth.users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                full_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP
            )
        `);

        // Insert/Update Admin
        console.log('Setting admin password...');
        await client.query(`
            INSERT INTO auth.users (email, password_hash, role, full_name)
            VALUES ($1, crypt($2, gen_salt('bf', 10)), 'admin', 'Nongor Admin')
            ON CONFLICT (email) 
            DO UPDATE SET 
                password_hash = crypt($2, gen_salt('bf', 10)),
                role = 'admin';
        `, [email, password]);

        console.log('\nSUCCESS: Admin password reset.');
        console.log('--------------------------------------------------');
        console.log('Email:    ' + email);
        console.log('Password: ' + password);
        console.log('--------------------------------------------------');

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}

reset();
