const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL is not set.');
    process.exit(1);
}

async function updateSchema() {
    const client = new Client({ connectionString });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected!');

        // Check column type
        const res = await client.query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'images'
        `);

        if (res.rows.length > 0) {
            const type = res.rows[0].data_type;
            console.log(`Current images type: ${type}`);

            if (type !== 'jsonb') {
                console.log('Converting images to JSONB...');
                // Handle TEXT[] to JSONB conversion or generic conversion
                // If it's pure ARRAY, to_jsonb(images) might work
                // But simpler ensuring it handles edge cases
                await client.query('ALTER TABLE products ALTER COLUMN images TYPE JSONB USING to_jsonb(images)');
                console.log('✅ Converted to JSONB!');
            } else {
                console.log('✅ Already JSONB.');
            }
        } else {
            console.log('Column images does not exist, adding as JSONB...');
            await client.query("ALTER TABLE products ADD COLUMN images JSONB DEFAULT '[]'::jsonb");
            console.log('✅ Column added!');
        }

        console.log('\n🎉 Database update complete!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

updateSchema();
