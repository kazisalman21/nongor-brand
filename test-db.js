const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_6Yurm1NtbxHI@ep-plain-art-aez29oyf-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function initDB() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected successfully!');

        console.log('Creating tables...');

        // Products Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                image TEXT,
                description TEXT,
                category_slug VARCHAR(100),
                category_name VARCHAR(100),
                is_featured BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Verified "products" table.');

        // Orders Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                order_id TEXT PRIMARY KEY,
                customer_name TEXT,
                phone TEXT,
                address TEXT,
                product_name TEXT,
                total_price NUMERIC,
                status TEXT DEFAULT 'Pending',
                delivery_status TEXT DEFAULT 'Pending',
                payment_status TEXT DEFAULT 'Unpaid',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                payment_method TEXT DEFAULT 'COD',
                trx_id TEXT,
                sender_number TEXT,
                delivery_date TEXT,
                size TEXT,
                quantity INTEGER
            );
        `);

        // Manual column additions just in case (parity with api/index.js logic)
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_price NUMERIC;`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS size TEXT;`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER;`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS sender_number TEXT;`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS trx_id TEXT;`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'Pending';`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Unpaid';`);

        console.log('Verified "orders" table.');

        console.log('Database initialization complete!');
    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await client.end();
    }
}

initDB();
