/**
 * Migrate Auth Schema: Neon → Supabase & Aiven
 * 
 * Copies the custom 'auth' schema from Neon, renaming it to 'app_auth'
 * on targets (because Supabase reserves the 'auth' schema).
 * 
 * Run: node scripts/migrate_auth_schema.js [--target supabase|aiven|all]
 */
require('dotenv').config();
const { Pool } = require('pg');

const PROVIDERS = {
    neon: process.env.NEON_DATABASE_URL,
    supabase: process.env.SUPABASE_DATABASE_URL,
    aiven: process.env.AIVEN_DATABASE_URL,
};

// Target schema name (Supabase reserves 'auth')
const TARGET_SCHEMA = 'app_auth';

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

const args = process.argv.slice(2);
const targetArg = args.includes('--target') ? args[args.indexOf('--target') + 1] : 'all';

async function getAuthSchema(sourceClient) {
    console.log('\n  📖 Reading auth schema from Neon...');

    const schemaCheck = await sourceClient.query(`
        SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth'
    `);
    if (schemaCheck.rows.length === 0) {
        throw new Error('auth schema does not exist on source database');
    }

    // Get function definitions and rewrite schema references
    const funcsRes = await sourceClient.query(`
        SELECT pg_get_functiondef(p.oid) as funcdef, p.proname as name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'auth'
        ORDER BY p.proname;
    `);
    console.log(`     Found ${funcsRes.rows.length} functions`);

    // Get tables
    const tablesRes = await sourceClient.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'auth' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    `);
    console.log(`     Found ${tablesRes.rows.length} tables`);

    const tables = [];
    for (const { table_name } of tablesRes.rows) {
        const colsRes = await sourceClient.query(`
            SELECT column_name, data_type, character_maximum_length,
                   column_default, is_nullable, udt_name,
                   numeric_precision, numeric_scale
            FROM information_schema.columns
            WHERE table_schema = 'auth' AND table_name = $1
            ORDER BY ordinal_position;
        `, [table_name]);

        const pkRes = await sourceClient.query(`
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'auth'
                AND tc.table_name = $1
                AND tc.constraint_type = 'PRIMARY KEY'
            ORDER BY kcu.ordinal_position;
        `, [table_name]);

        const uniqRes = await sourceClient.query(`
            SELECT kcu.column_name, tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'auth'
                AND tc.table_name = $1
                AND tc.constraint_type = 'UNIQUE'
            ORDER BY tc.constraint_name, kcu.ordinal_position;
        `, [table_name]);

        const uniqueConstraints = {};
        for (const row of uniqRes.rows) {
            if (!uniqueConstraints[row.constraint_name]) uniqueConstraints[row.constraint_name] = [];
            uniqueConstraints[row.constraint_name].push(row.column_name);
        }

        const colDefs = colsRes.rows.map(col => {
            const isSerial = col.column_default && col.column_default.includes('nextval(');
            let type;
            if (isSerial) {
                type = (col.udt_name === 'int8') ? 'BIGSERIAL' : 'SERIAL';
            } else {
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
            if (!isSerial && col.column_default !== null) {
                // Rewrite any auth. references in defaults to target schema
                let defaultVal = col.column_default;
                defaultVal = defaultVal.replace(/auth\./g, `${TARGET_SCHEMA}.`);
                def += ` DEFAULT ${defaultVal}`;
            }
            if (!isSerial && col.is_nullable === 'NO') def += ` NOT NULL`;
            return def;
        });

        const pkColumns = pkRes.rows.map(r => r.column_name);
        if (pkColumns.length > 0) {
            colDefs.push(`    PRIMARY KEY (${pkColumns.map(c => `"${c}"`).join(', ')})`);
        }
        for (const [, cols] of Object.entries(uniqueConstraints)) {
            colDefs.push(`    UNIQUE (${cols.map(c => `"${c}"`).join(', ')})`);
        }

        const ddl = `CREATE TABLE IF NOT EXISTS ${TARGET_SCHEMA}."${table_name}" (\n${colDefs.join(',\n')}\n);`;

        const dataRes = await sourceClient.query(`SELECT * FROM auth."${table_name}"`);
        tables.push({ name: table_name, ddl, data: dataRes.rows });
    }

    // Get indexes and rewrite schema references
    const indexRes = await sourceClient.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'auth'
        AND indexname NOT IN (
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE (constraint_type = 'PRIMARY KEY' OR constraint_type = 'UNIQUE')
            AND table_schema = 'auth'
        )
        ORDER BY indexname;
    `);

    return {
        functions: funcsRes.rows,
        tables,
        indexes: indexRes.rows.map(r => {
            let def = r.indexdef
                .replace(/CREATE INDEX/, 'CREATE INDEX IF NOT EXISTS')
                .replace(/CREATE UNIQUE INDEX/, 'CREATE UNIQUE INDEX IF NOT EXISTS')
                .replace(/ON auth\./g, `ON ${TARGET_SCHEMA}.`);
            return def;
        })
    };
}

async function migrateAuth(targetName, targetUrl, schema) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`  Migrating auth → ${TARGET_SCHEMA} on ${targetName.toUpperCase()}`);
    console.log(`${'='.repeat(50)}`);

    const targetPool = createPool(targetUrl);
    const targetClient = await targetPool.connect();

    try {
        // Extensions
        console.log('\n  🔧 Ensuring extensions...');
        for (const ext of ['pgcrypto', 'uuid-ossp']) {
            try {
                await targetClient.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`);
                console.log(`     ✅ ${ext}`);
            } catch (e) {
                console.log(`     ⚠️  ${ext}: ${e.message.split('\n')[0]}`);
            }
        }

        // Create schema
        console.log(`\n  📁 Creating ${TARGET_SCHEMA} schema...`);
        await targetClient.query(`CREATE SCHEMA IF NOT EXISTS ${TARGET_SCHEMA}`);
        console.log('     ✅ Schema created');

        // Create tables
        console.log(`\n  📋 Creating ${schema.tables.length} tables...`);
        for (const table of schema.tables) {
            try {
                await targetClient.query(table.ddl);
                console.log(`     ✅ ${TARGET_SCHEMA}.${table.name}`);
            } catch (e) {
                console.log(`     ❌ ${TARGET_SCHEMA}.${table.name}: ${e.message.split('\n')[0]}`);
            }
        }

        // Create functions (rewrite auth. → app_auth.)
        console.log(`\n  ⚡ Creating ${schema.functions.length} functions...`);
        for (const func of schema.functions) {
            try {
                let funcDef = func.funcdef;
                // Replace all auth. schema references with target schema
                funcDef = funcDef.replace(/\bauth\./g, `${TARGET_SCHEMA}.`);
                await targetClient.query(funcDef);
                console.log(`     ✅ ${TARGET_SCHEMA}.${func.name}`);
            } catch (e) {
                console.log(`     ❌ ${TARGET_SCHEMA}.${func.name}: ${e.message.split('\n')[0]}`);
            }
        }

        // Create indexes
        if (schema.indexes.length > 0) {
            console.log(`\n  📑 Creating ${schema.indexes.length} indexes...`);
            for (const idx of schema.indexes) {
                try {
                    await targetClient.query(idx);
                    console.log(`     ✅ ${idx.match(/INDEX\s+(?:IF NOT EXISTS\s+)?(\S+)/)?.[1] || 'index'}`);
                } catch (e) {
                    console.log(`     ⚠️  ${e.message.split('\n')[0]}`);
                }
            }
        }

        // Copy data
        console.log(`\n  📦 Copying data...`);
        for (const table of schema.tables) {
            if (table.data.length === 0) {
                console.log(`     ⏭️  ${TARGET_SCHEMA}.${table.name}: 0 rows`);
                continue;
            }
            try {
                const existingCount = await targetClient.query(`SELECT count(*) FROM ${TARGET_SCHEMA}."${table.name}"`);
                if (parseInt(existingCount.rows[0].count) > 0) {
                    console.log(`     ⏭️  ${TARGET_SCHEMA}.${table.name}: already has ${existingCount.rows[0].count} rows`);
                    continue;
                }
            } catch (e) { continue; }

            const columns = Object.keys(table.data[0]);
            const colNames = columns.map(c => `"${c}"`).join(', ');
            let inserted = 0;
            for (const row of table.data) {
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                const values = columns.map(c => row[c]);
                try {
                    await targetClient.query(
                        `INSERT INTO ${TARGET_SCHEMA}."${table.name}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                        values
                    );
                    inserted++;
                } catch (e) { /* skip */ }
            }
            console.log(`     ✅ ${TARGET_SCHEMA}.${table.name}: ${inserted}/${table.data.length} rows`);
        }

        // Sync sequences
        console.log(`\n  🔢 Syncing sequences...`);
        for (const table of schema.tables) {
            try {
                const seqRes = await targetClient.query(`
                    SELECT pg_get_serial_sequence('${TARGET_SCHEMA}."${table.name}"', column_name) as seq, column_name
                    FROM information_schema.columns
                    WHERE table_name = '${table.name}' AND table_schema = '${TARGET_SCHEMA}'
                    AND column_default LIKE 'nextval%'
                `);
                for (const { seq, column_name } of seqRes.rows) {
                    if (seq) {
                        await targetClient.query(
                            `SELECT setval($1, COALESCE((SELECT MAX("${column_name}") FROM ${TARGET_SCHEMA}."${table.name}"), 0) + 1, false)`,
                            [seq]
                        );
                        console.log(`     ✅ ${TARGET_SCHEMA}.${table.name}.${column_name}`);
                    }
                }
            } catch (e) { /* no sequences */ }
        }

        console.log(`\n  🎉 Auth schema migration to ${targetName.toUpperCase()} complete!\n`);
    } finally {
        targetClient.release();
        await targetPool.end();
    }
}

async function main() {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║   Auth Schema Migration (Neon → Target)  ║');
    console.log(`║   Source: auth → Target: ${TARGET_SCHEMA}        ║`);
    console.log('╚══════════════════════════════════════════╝');

    if (!PROVIDERS.neon) {
        console.error('  ❌ NEON_DATABASE_URL not set');
        process.exit(1);
    }

    const sourcePool = createPool(PROVIDERS.neon);
    const sourceClient = await sourcePool.connect();

    try {
        const schema = await getAuthSchema(sourceClient);

        const targets = [];
        if (targetArg === 'all' || targetArg === 'supabase') {
            if (PROVIDERS.supabase) targets.push(['supabase', PROVIDERS.supabase]);
        }
        if (targetArg === 'all' || targetArg === 'aiven') {
            if (PROVIDERS.aiven) targets.push(['aiven', PROVIDERS.aiven]);
        }

        for (const [name, url] of targets) {
            await migrateAuth(name, url, schema);
        }
    } catch (err) {
        console.error(`\n  ❌ Error: ${err.message}`);
    } finally {
        sourceClient.release();
        await sourcePool.end();
    }
}

main();
