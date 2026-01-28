const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_aXlrxhuS9GR8@ep-plain-art-aez29oyf-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

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

        const requiredFuncs = ['create_user', 'verify_user', 'create_session', 'verify_session', 'delete_session'];
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
