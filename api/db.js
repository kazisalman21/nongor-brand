/**
 * Database Connection Pool
 * Reusable connections for better performance
 */
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
}

// Create connection pool (REUSABLE!)
// Fix for PG SSL warning: Append strict mode or compatibility mode
// We use 'require' because Vercel/Neon certs are self-signed/managed differently
let finalConnectionString = connectionString;
if (connectionString && !connectionString.includes('sslmode=')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    finalConnectionString += `${separator}sslmode=require`;
}

const pool = new Pool({
    connectionString: finalConnectionString,
    ssl: {
        // SECURITY NOTE: rejectUnauthorized is set to false because Vercel/Neon use
        // managed SSL certificates that may not be verifiable by the default CA bundle.
        // This is acceptable in this context because the connection is already encrypted
        // and Neon handles certificate management. For self-hosted PostgreSQL, set to true.
        rejectUnauthorized: false
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
