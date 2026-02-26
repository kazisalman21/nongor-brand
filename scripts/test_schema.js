const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_aXlrxhuS9GR8@ep-plain-art-aez29oyf-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

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
