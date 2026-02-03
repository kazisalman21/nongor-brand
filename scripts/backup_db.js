require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Ensure backups directory exists
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

async function backupTable(tableName) {
    try {
        const res = await pool.query(`SELECT * FROM ${tableName}`);
        const filePath = path.join(backupDir, `${tableName}_${timestamp}.json`);
        fs.writeFileSync(filePath, JSON.stringify(res.rows, null, 2));
        console.log(`✅ ${tableName} backed up: ${res.rowCount} rows`);
    } catch (err) {
        console.error(`❌ Error backing up ${tableName}:`, err.message);
    }
}

async function runBackup() {
    console.log(`📦 Starting Database Backup...`);
    console.log(`📂 Saving to: ${backupDir}`);

    try {
        await backupTable('products');
        await backupTable('orders');
        // Add other tables if they exist, e.g., 'users'
        // await backupTable('users'); 

        console.log('✨ Backup completed successfully!');
    } catch (err) {
        console.error('Snapshot failed:', err);
    } finally {
        pool.end();
    }
}

runBackup();
