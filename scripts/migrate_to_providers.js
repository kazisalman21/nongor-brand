/**
 * Migrate Database: Neon → Supabase & Aiven
 * 
 * Copies all tables (schema + data) from Neon to the other providers.
 * Run: node scripts/migrate_to_providers.js
 * 
 * Options:
 *   --target supabase   (migrate to Supabase only)
 *   --target aiven      (migrate to Aiven only)
 *   --target all        (migrate to both, default)
 *   --schema-only       (skip data, create tables only)
 *   --drop-first        (drop existing tables on target before migrating)
 */
require('dotenv').config();
const { Pool } = require('pg');

// --- Config ---
const PROVIDERS = {
    neon: process.env.NEON_DATABASE_URL,
    supabase: process.env.SUPABASE_DATABASE_URL,
    aiven: process.env.AIVEN_DATABASE_URL,
};

function createPool(url) {
    const parsed = new URL(url);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('channel_binding');
    return new Pool({
        connectionString: parsed.toString(),
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
    });
}

function mask(url) {
    return url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

// --- Parse CLI args ---
const args = process.argv.slice(2);
const targetArg = args.includes('--target') ? args[args.indexOf('--target') + 1] : 'all';
const schemaOnly = args.includes('--schema-only');
const dropFirst = args.includes('--drop-first');

/**
 * Gets the full DDL from source by querying pg_dump-style metadata.
 * Converts nextval() defaults → SERIAL/BIGSERIAL for portability.
 */
async function getFullSchema(client) {
    // Get all user tables
    const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    const createStatements = [];

    for (const table of tables) {
        // Get column definitions
        const colsRes = await client.query(`
            SELECT column_name, data_type, character_maximum_length, 
                   column_default, is_nullable, udt_name,
                   numeric_precision, numeric_scale
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position;
        `, [table]);

        // Get primary key columns
        const pkRes = await client.query(`
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'public' 
                AND tc.table_name = $1 
                AND tc.constraint_type = 'PRIMARY KEY'
            ORDER BY kcu.ordinal_position;
        `, [table]);
        const pkColumns = pkRes.rows.map(r => r.column_name);

        // Get unique constraints
        const uniqRes = await client.query(`
            SELECT kcu.column_name, tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'public' 
                AND tc.table_name = $1 
                AND tc.constraint_type = 'UNIQUE'
            ORDER BY tc.constraint_name, kcu.ordinal_position;
        `, [table]);

        // Group unique constraints
        const uniqueConstraints = {};
        for (const row of uniqRes.rows) {
            if (!uniqueConstraints[row.constraint_name]) uniqueConstraints[row.constraint_name] = [];
            uniqueConstraints[row.constraint_name].push(row.column_name);
        }

        // Build column definitions
        const colDefs = colsRes.rows.map(col => {
            const isSerial = col.column_default && col.column_default.includes('nextval(');

            let type;
            if (isSerial) {
                // Convert nextval() default to SERIAL/BIGSERIAL
                if (col.udt_name === 'int8' || col.data_type === 'bigint') {
                    type = 'BIGSERIAL';
                } else {
                    type = 'SERIAL';
                }
            } else {
                // Normal type mapping
                switch (col.udt_name) {
                    case 'int4': type = 'INTEGER'; break;
                    case 'int8': type = 'BIGINT'; break;
                    case 'int2': type = 'SMALLINT'; break;
                    case 'float4': type = 'REAL'; break;
                    case 'float8': type = 'DOUBLE PRECISION'; break;
                    case 'bool': type = 'BOOLEAN'; break;
                    case 'varchar': type = `VARCHAR(${col.character_maximum_length || 255})`; break;
                    case 'text': type = 'TEXT'; break;
                    case 'timestamp': type = 'TIMESTAMP'; break;
                    case 'timestamptz': type = 'TIMESTAMPTZ'; break;
                    case 'jsonb': type = 'JSONB'; break;
                    case 'json': type = 'JSON'; break;
                    case 'uuid': type = 'UUID'; break;
                    case 'numeric':
                        type = col.numeric_precision ? `NUMERIC(${col.numeric_precision},${col.numeric_scale})` : 'NUMERIC';
                        break;
                    default:
                        if (col.data_type === 'ARRAY') type = col.udt_name.replace(/^_/, '') + '[]';
                        else if (col.data_type === 'USER-DEFINED') type = col.udt_name;
                        else type = col.data_type;
                }
            }

            let def = `    "${col.column_name}" ${type}`;

            // Add DEFAULT (skip for SERIAL types — they auto-create sequences)
            if (!isSerial && col.column_default !== null) {
                def += ` DEFAULT ${col.column_default}`;
            }

            // NOT NULL (SERIAL is implicitly NOT NULL)
            if (!isSerial && col.is_nullable === 'NO') {
                def += ` NOT NULL`;
            }

            return def;
        });

        // PRIMARY KEY
        if (pkColumns.length > 0) {
            colDefs.push(`    PRIMARY KEY (${pkColumns.map(c => `"${c}"`).join(', ')})`);
        }

        // UNIQUE constraints
        for (const [name, cols] of Object.entries(uniqueConstraints)) {
            colDefs.push(`    UNIQUE (${cols.map(c => `"${c}"`).join(', ')})`);
        }

        createStatements.push({
            table,
            ddl: `CREATE TABLE IF NOT EXISTS "${table}" (\n${colDefs.join(',\n')}\n);`
        });
    }

    // Get indexes (skip primary key and unique constraint indexes)
    const indexRes = await client.query(`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname NOT IN (
            SELECT constraint_name FROM information_schema.table_constraints 
            WHERE (constraint_type = 'PRIMARY KEY' OR constraint_type = 'UNIQUE')
            AND table_schema = 'public'
        )
        ORDER BY indexname;
    `);

    const indexes = indexRes.rows.map(r =>
        r.indexdef.replace(/CREATE INDEX/, 'CREATE INDEX IF NOT EXISTS')
            .replace(/CREATE UNIQUE INDEX/, 'CREATE UNIQUE INDEX IF NOT EXISTS')
    );

    return { tables, createStatements, indexes };
}

async function migrateToTarget(sourceClient, targetName, targetUrl) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`  Migrating to: ${targetName.toUpperCase()}`);
    console.log(`  URL: ${mask(targetUrl)}`);
    console.log(`${'='.repeat(50)}\n`);

    const targetPool = createPool(targetUrl);
    const targetClient = await targetPool.connect();

    try {
        const { tables, createStatements, indexes } = await getFullSchema(sourceClient);

        // 0. Drop tables if --drop-first
        if (dropFirst) {
            console.log(`  🗑️  Dropping existing tables...`);
            for (const table of [...tables].reverse()) {
                try {
                    await targetClient.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
                    console.log(`     ✅ Dropped ${table}`);
                } catch (err) {
                    console.log(`     ⚠️  ${table}: ${err.message.split('\n')[0]}`);
                }
            }
            console.log('');
        }

        // 1. Create tables
        console.log(`  📋 Creating ${createStatements.length} tables...`);
        for (const { table, ddl } of createStatements) {
            try {
                await targetClient.query(ddl);
                console.log(`     ✅ ${table}`);
            } catch (err) {
                console.log(`     ❌ ${table}: ${err.message.split('\n')[0]}`);
            }
        }

        // 2. Create indexes
        if (indexes.length > 0) {
            console.log(`\n  📑 Creating ${indexes.length} indexes...`);
            for (const idx of indexes) {
                try {
                    await targetClient.query(idx);
                    const name = idx.match(/INDEX\s+(?:IF NOT EXISTS\s+)?(\S+)/)?.[1] || 'index';
                    console.log(`     ✅ ${name}`);
                } catch (err) {
                    console.log(`     ⚠️  ${err.message.split('\n')[0]}`);
                }
            }
        }

        // 3. Copy data
        if (!schemaOnly) {
            console.log(`\n  📦 Copying data...`);
            for (const table of tables) {
                try {
                    const rows = await sourceClient.query(`SELECT * FROM "${table}"`);
                    if (rows.rows.length === 0) {
                        console.log(`     ⏭️  ${table}: 0 rows (skipped)`);
                        continue;
                    }

                    // Check if target already has data
                    const existingCount = await targetClient.query(`SELECT count(*) FROM "${table}"`);
                    if (!dropFirst && parseInt(existingCount.rows[0].count) > 0) {
                        console.log(`     ⏭️  ${table}: target already has ${existingCount.rows[0].count} rows (skipped)`);
                        continue;
                    }

                    const data = rows.rows;
                    const columns = Object.keys(data[0]);
                    const colNames = columns.map(c => `"${c}"`).join(', ');
                    let inserted = 0;

                    for (const row of data) {
                        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                        const values = columns.map(c => row[c]);
                        try {
                            await targetClient.query(
                                `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                                values
                            );
                            inserted++;
                        } catch (err) {
                            // Skip individual row errors
                        }
                    }
                    console.log(`     ✅ ${table}: ${inserted}/${data.length} rows copied`);
                } catch (err) {
                    console.log(`     ❌ ${table}: ${err.message.split('\n')[0]}`);
                }
            }

            // 4. Sync sequences
            console.log(`\n  🔢 Syncing sequences...`);
            for (const table of tables) {
                try {
                    const seqRes = await targetClient.query(`
                        SELECT pg_get_serial_sequence($1, column_name) as seq, column_name
                        FROM information_schema.columns 
                        WHERE table_name = $1 AND table_schema = 'public'
                        AND column_default LIKE 'nextval%'
                    `, [table]);
                    for (const { seq, column_name } of seqRes.rows) {
                        if (seq) {
                            await targetClient.query(
                                `SELECT setval($1, COALESCE((SELECT MAX("${column_name}") FROM "${table}"), 0) + 1, false)`,
                                [seq]
                            );
                            console.log(`     ✅ ${table}.${column_name}`);
                        }
                    }
                } catch (err) {
                    // No sequences for this table
                }
            }
        }

        console.log(`\n  🎉 Migration to ${targetName.toUpperCase()} complete!\n`);
    } finally {
        targetClient.release();
        await targetPool.end();
    }
}

async function main() {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║   Neon → Supabase/Aiven Data Migration   ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`\n  Source:  NEON (${mask(PROVIDERS.neon || 'NOT SET')})`);
    console.log(`  Target:  ${targetArg.toUpperCase()}`);
    console.log(`  Mode:    ${schemaOnly ? 'SCHEMA ONLY' : 'SCHEMA + DATA'}${dropFirst ? ' (DROP FIRST)' : ''}`);

    if (!PROVIDERS.neon) {
        console.error('\n  ❌ NEON_DATABASE_URL is not set in .env');
        process.exit(1);
    }

    const sourcePool = createPool(PROVIDERS.neon);
    const sourceClient = await sourcePool.connect();

    try {
        const testRes = await sourceClient.query('SELECT NOW()');
        console.log(`\n  ✅ Connected to Neon (${testRes.rows[0].now})`);

        const targets = [];
        if (targetArg === 'all' || targetArg === 'supabase') {
            if (PROVIDERS.supabase) targets.push(['supabase', PROVIDERS.supabase]);
            else console.log('\n  ⚠️  SUPABASE_DATABASE_URL not set, skipping');
        }
        if (targetArg === 'all' || targetArg === 'aiven') {
            if (PROVIDERS.aiven) targets.push(['aiven', PROVIDERS.aiven]);
            else console.log('\n  ⚠️  AIVEN_DATABASE_URL not set, skipping');
        }

        for (const [name, url] of targets) {
            await migrateToTarget(sourceClient, name, url);
        }
    } catch (err) {
        console.error(`\n  ❌ Error: ${err.message}`);
    } finally {
        sourceClient.release();
        await sourcePool.end();
    }
}

main();
