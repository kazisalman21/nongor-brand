require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000 // 5s timeout
});

console.log('Testing connection to:', process.env.NETLIFY_DATABASE_URL.split('@')[1]); // Log host only

client.connect()
    .then(() => {
        console.log('✅ Connected successfully!');
        return client.end();
    })
    .catch(err => {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    });
