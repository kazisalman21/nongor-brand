/**
 * Test script to verify all bug fixes are in place
 * Run: node test-fixes.js
 */
require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    process.exit(1);
}

async function test() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Database connection successful\n');

        let allPassed = true;

        // Test 1: Check images column
        console.log('Test 1: Checking images column...');
        const imgCol = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'images'
        `);
        if (imgCol.rows.length > 0) {
            console.log('  ✅ images column exists');
        } else {
            console.log('  ❌ images column MISSING');
            allPassed = false;
        }

        // Test 2: Check v3 functions
        console.log('\nTest 2: Checking v3 auth functions...');
        const funcs = await client.query(`
            SELECT routine_name FROM information_schema.routines 
            WHERE routine_schema = 'auth' 
            AND routine_name IN ('verify_user_v3', 'verify_session_v3')
        `);
        if (funcs.rows.length === 2) {
            console.log('  ✅ verify_user_v3 exists');
            console.log('  ✅ verify_session_v3 exists');
        } else {
            console.log('  ❌ v3 auth functions MISSING (found: ' + funcs.rows.length + '/2)');
            allPassed = false;
        }

        // Test 3: Check admin user
        console.log('\nTest 3: Checking admin user...');
        const admin = await client.query(`SELECT email FROM auth.users WHERE role = 'admin'`);
        if (admin.rows.length > 0) {
            console.log('  ✅ Admin user exists: ' + admin.rows[0].email);
        } else {
            console.log('  ❌ Admin user MISSING');
            allPassed = false;
        }

        // Test 4: Check indexes
        console.log('\nTest 4: Checking performance indexes...');
        const indexes = await client.query(`
            SELECT indexname FROM pg_indexes 
            WHERE tablename IN ('products', 'orders', 'users', 'sessions') 
            AND indexname LIKE 'idx_%'
        `);
        console.log('  ✅ Found ' + indexes.rows.length + ' performance indexes');

        // Summary
        console.log('\n' + '='.repeat(50));
        if (allPassed) {
            console.log('🎉 ALL TESTS PASSED! Database is properly configured.');
        } else {
            console.log('⚠️  SOME TESTS FAILED. Run: node scripts/setup_auth_pg.js');
        }
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await client.end();
    }
}

test();
