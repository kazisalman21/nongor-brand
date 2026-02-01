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
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,                      // Maximum 20 connections
    idleTimeoutMillis: 30000,     // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Timeout after 5s
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
