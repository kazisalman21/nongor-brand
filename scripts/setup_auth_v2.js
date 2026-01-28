const { Client } = require('pg');

// Hardcoded connection string
const connectionString = "postgresql://neondb_owner:npg_aXlrxhuS9GR8@ep-plain-art-aez29oyf-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000 // 5 second timeout
});

async function setup() {
    console.log('Setting up V2 Auth Functions...');

    try {
        await client.connect();

        // auth.verify_user_v2
        // optimizations: 
        // 1. Used 'v2' suffix to ensure clean slate (no conflicts with old function signatures)
        // 2. Used UPDATE ... RETURNING to do check + update in ONE atomic statement
        // 3. Removed complex variable scoping checks
        console.log('Creating auth.verify_user_v2...');
        await client.query(`
            CREATE OR REPLACE FUNCTION auth.verify_user_v2(
                p_email TEXT,
                p_password TEXT
            )
            RETURNS TABLE(user_id UUID, email VARCHAR, role VARCHAR, full_name VARCHAR) AS $$
            BEGIN
                RETURN QUERY
                UPDATE auth.users
                SET last_login = NOW()
                WHERE LOWER(email) = LOWER(p_email)
                AND password_hash = crypt(p_password, password_hash)
                RETURNING id, email, role, full_name;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // auth.verify_session_v2
        console.log('Creating auth.verify_session_v2...');
        await client.query(`
            CREATE OR REPLACE FUNCTION auth.verify_session_v2(p_session_token TEXT)
            RETURNS TABLE(user_id UUID, email VARCHAR, role VARCHAR, full_name VARCHAR) AS $$
            BEGIN
                RETURN QUERY
                SELECT u.id, u.email, u.role, u.full_name
                FROM auth.sessions s
                JOIN auth.users u ON s.user_id = u.id
                WHERE s.session_token = p_session_token
                AND s.expires_at > NOW();
            END;
            $$ LANGUAGE plpgsql;
        `);

        console.log('\n==================================================');
        console.log('✅ V2 FUNCTIONS CREATED SUCCESSFULLY');
        console.log('==================================================');

    } catch (error) {
        console.error('❌ Setup failed:', error);
    } finally {
        await client.end();
    }
}

setup();
