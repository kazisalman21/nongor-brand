/**
 * Database Connection Pool
 * Supports multiple providers: Neon, Supabase, Aiven
 * Set ACTIVE_DB_PROVIDER in .env to switch ("neon" | "supabase" | "aiven")
 */
require('dotenv').config();
const { Pool } = require('pg');

// --- Provider resolution ---
const PROVIDER_MAP = {
    neon: 'NEON_DATABASE_URL',
    supabase: 'SUPABASE_DATABASE_URL',
    aiven: 'AIVEN_DATABASE_URL',
};

const provider = (process.env.ACTIVE_DB_PROVIDER || 'supabase').toLowerCase();
const envKey = PROVIDER_MAP[provider];

if (!envKey) {
    console.error(`❌ ERROR: Unknown ACTIVE_DB_PROVIDER "${provider}". Use one of: ${Object.keys(PROVIDER_MAP).join(', ')}`);
}

// Resolve connection string: provider-specific → legacy fallbacks
const connectionString = (envKey && process.env[envKey])
    || process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error(`❌ ERROR: No database URL found for provider "${provider}" (env var: ${envKey})`);
} else {
    // Log provider + host (mask password)
    const safeUrl = connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
    console.log(`🗄️  Database provider: ${provider.toUpperCase()} → ${safeUrl}`);
}

// --- Build pool ---
// Strip SSL-related params from connection string; SSL is enforced via Pool ssl option.
let finalConnectionString = connectionString;
if (connectionString) {
    try {
        const parsed = new URL(connectionString);
        parsed.searchParams.delete('sslmode');
        parsed.searchParams.delete('channel_binding');
        finalConnectionString = parsed.toString();
    } catch (e) {
        // If URL parsing fails, use as-is
    }
}

const pool = new Pool({
    connectionString: finalConnectionString,
    ssl: {
        // All three providers (Neon, Supabase, Aiven) use managed SSL certs.
        // rejectUnauthorized: false is acceptable here; the connection is still encrypted.
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true
});

// Auth schema name: Supabase reserves 'auth', so we use 'app_auth' on non-Neon providers
const AUTH_SCHEMA = process.env.AUTH_SCHEMA || (provider === 'neon' ? 'auth' : 'app_auth');
console.log(`🔐 Auth schema: ${AUTH_SCHEMA}`);

// Log connection events
pool.on('connect', () => {
    console.log(`✅ Database pool [${provider.toUpperCase()}]: New connection established`);
});

pool.on('error', (err) => {
    console.error(`❌ Database pool [${provider.toUpperCase()}] error:`, err.message);
});

// Export pool (default) + AUTH_SCHEMA as properties
pool.AUTH_SCHEMA = AUTH_SCHEMA;
module.exports = pool;
