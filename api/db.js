/**
 * Database Connection Pool
 * Reusable connections for better performance
 */
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
}

// Create connection pool (REUSABLE!)
// Fix for PG SSL warning: Append strict mode or compatibility mode
if (connectionString && !connectionString.includes('sslmode=')) {
    // Append sslmode=require to ensure encrypted connection
    // The warning suggests uselibpqcompat=true for compatibility if verifying fails
    // But for Neon/Vercel, usually 'sslmode=require' with rejectUnauthorized: false works best for node-postgres.
}

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false // This fixes the self-signed cert issue on Vercel/Neon
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true
});

// Log connection events
pool.on('connect', () => {
    console.log('✅ Database pool: New connection established');
});

pool.on('error', (err) => {
    console.error('❌ Database pool error:', err.message);
});

module.exports = pool;
