/**
 * Test Schema - Orders Table
 * Uses the shared db pool (respects ACTIVE_DB_PROVIDER)
 */
require('dotenv').config();
const pool = require('../api/db');

async function check() {
    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'orders';
        `);
        console.log("ORDERS TABLE SCHEMA:");
        console.log(res.rows);
        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
