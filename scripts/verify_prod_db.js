const fs = require('fs');
const { Pool } = require('pg');

// Hardcoded for verification only - DELETE AFTER USE
const connectionString = 'postgresql://neondb_owner:npg_aXlrxhuS9GR8@ep-plain-art-aez29oyf-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

console.log('Checking DB...');

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, // 10s timeout
});

async function check() {
    try {
        const client = await pool.connect();
        console.log('Connected!');

        const res = await client.query("SELECT to_regclass('public.admin_users') as table_exists;");
        let output = `Table Exists: ${res.rows[0].table_exists ? 'YES' : 'NO'}\n`;

        if (res.rows[0].table_exists) {
            const count = await client.query('SELECT count(*) FROM admin_users');
            output += `User Count: ${count.rows[0].count}\n`;

            // Allow checking if the specific admin user exists
            const user = await client.query("SELECT username, email, role FROM admin_users WHERE username = 'admin'");
            if (user.rows.length > 0) {
                output += `Admin User Found: ${user.rows[0].username} (${user.rows[0].email})\n`;
            } else {
                output += `Admin User Found: NO\n`;
            }
        }

        fs.writeFileSync('prod_verification.txt', output);
        console.log('Done writing file.');
        client.release();
    } catch (err) {
        console.error(err);
        fs.writeFileSync('prod_verification.txt', `ERROR: ${err.message}\n`);
    } finally {
        await pool.end();
    }
}

check();
