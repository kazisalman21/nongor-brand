require('dotenv').config();
const { Client } = require('pg');

// Use environment variable instead of hardcoded credentials
const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please create a .env file with your database credentials.');
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        await client.connect();

        console.log('Checking database integrity...');

        // Check tables
        const tables = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'auth'
        `);
        const tableNames = tables.rows.map(r => r.table_name);
        console.log('Tables found:', tableNames);

        const hasUsers = tableNames.includes('users');
        const hasSessions = tableNames.includes('sessions');

        // Check functions
        const functions = await client.query(`
            SELECT routine_name FROM information_schema.routines 
            WHERE routine_schema = 'auth'
        `);
        const funcNames = functions.rows.map(r => r.routine_name);
        console.log('Functions found:', funcNames);

        const requiredFuncs = ['create_user', 'verify_user_v3', 'create_session', 'verify_session_v3', 'delete_session'];
        const missingFuncs = requiredFuncs.filter(f => !funcNames.includes(f));

        if (!hasUsers || !hasSessions || missingFuncs.length > 0) {
            console.log('\n❌ DATABASE SETUP INCOMPLETE');
            if (!hasUsers) console.log('- Missing table: auth.users');
            if (!hasSessions) console.log('- Missing table: auth.sessions');
            if (missingFuncs.length > 0) console.log('- Missing functions:', missingFuncs);
        } else {
            console.log('\n✅ DATABASE INTEGRITY CONFIRMED');
        }

    } catch (e) {
        console.error('Check failed:', e);
    } finally {
        await client.end();
    }
}

check();
