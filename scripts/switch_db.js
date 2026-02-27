/**
 * Database Provider Switch Verifier
 * Run: node scripts/switch_db.js
 * 
 * Tests connectivity to the currently active database provider
 * and lists all tables to verify schema is in place.
 */
require('dotenv').config();
const { Pool } = require('pg');

// --- Provider resolution (same logic as api/db.js) ---
const PROVIDER_MAP = {
    neon: 'NEON_DATABASE_URL',
    supabase: 'SUPABASE_DATABASE_URL',
    aiven: 'AIVEN_DATABASE_URL',
};

const provider = (process.env.ACTIVE_DB_PROVIDER || 'supabase').toLowerCase();
const envKey = PROVIDER_MAP[provider];

if (!envKey) {
    console.error(`❌ Unknown provider: "${provider}". Use: ${Object.keys(PROVIDER_MAP).join(', ')}`);
    process.exit(1);
}

const connectionString = process.env[envKey];
if (!connectionString) {
    console.error(`❌ ${envKey} is not set in .env`);
    process.exit(1);
}

const safeUrl = connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║     Database Provider Switch Check       ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');
console.log(`  Provider:  ${provider.toUpperCase()}`);
console.log(`  Env var:   ${envKey}`);
console.log(`  URL:       ${safeUrl}`);
console.log('');

// Strip SSL-related params from URL; SSL enforced via Pool ssl option
let cleanUrl = connectionString;
try {
    const parsed = new URL(connectionString);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('channel_binding');
    cleanUrl = parsed.toString();
} catch (e) { }

const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
});

async function verify() {
    try {
        const client = await pool.connect();

        // 1. Test basic connectivity
        const timeRes = await client.query('SELECT NOW() as server_time, version() as pg_version');
        console.log(`  ✅ Connected!`);
        console.log(`  ⏰ Server time: ${timeRes.rows[0].server_time}`);
        console.log(`  🐘 ${timeRes.rows[0].pg_version.split(',')[0]}`);
        console.log('');

        // 2. List all tables
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);

        if (tablesRes.rows.length === 0) {
            console.log('  ⚠️  No tables found! Run your migration scripts to set up the schema.');
            console.log('     Example: node scripts/setup_auth_pg.js');
        } else {
            console.log(`  📋 Tables found (${tablesRes.rows.length}):`);
            tablesRes.rows.forEach(row => {
                console.log(`     • ${row.table_name}`);
            });
        }

        console.log('');
        client.release();
    } catch (err) {
        console.error(`  ❌ Connection failed: ${err.message}`);
        console.log('');
        console.log('  Possible fixes:');
        console.log('  - Check if the URL in .env is correct');
        console.log('  - Make sure the database service is running');
        console.log('  - Check your network/firewall settings');
        console.log('');
    } finally {
        await pool.end();
    }
}

verify();
