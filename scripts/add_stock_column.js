const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

async function updateSchema() {
    const client = new Client({ connectionString });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected!');

        // Add stock_quantity column
        console.log('Adding stock_quantity column...');
        await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 100');
        console.log('✅ Column added!');

        // Update existing products
        console.log('Updating existing products...');
        const result = await client.query('UPDATE products SET stock_quantity = 100 WHERE stock_quantity IS NULL');
        console.log(`✅ Updated ${result.rowCount} products with default stock!`);

        // Verify
        const check = await client.query('SELECT id, name, stock_quantity FROM products LIMIT 5');
        console.log('\n📦 Sample products:');
        check.rows.forEach(row => {
            console.log(`  - ${row.name}: ${row.stock_quantity} in stock`);
        });

        console.log('\n🎉 Database update complete!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

updateSchema();
