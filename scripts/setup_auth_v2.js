require('dotenv').config();
const { Client } = require('pg');

// Use environment variable instead of hardcoded credentials
const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please create a .env file with your database credentials.');
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
});

async function setup() {
    console.log('Setting up V2/V3 Auth Functions...');

    try {
        await client.connect();

        // auth.verify_user_v2
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

        // auth.verify_user_v3 (with res_ prefix for column names)
        console.log('Creating auth.verify_user_v3...');
        await client.query(`
            CREATE OR REPLACE FUNCTION auth.verify_user_v3(
                p_email TEXT,
                p_password TEXT
            )
            RETURNS TABLE(user_id UUID, res_email VARCHAR, res_role VARCHAR, res_full_name VARCHAR) AS $$
            BEGIN
                RETURN QUERY
                UPDATE auth.users
                SET last_login = NOW()
                WHERE LOWER(email) = LOWER(p_email)
                AND password_hash = crypt(p_password, password_hash)
                RETURNING id AS user_id, email AS res_email, role AS res_role, full_name AS res_full_name;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // auth.verify_session_v3 (with res_ prefix for column names)
        console.log('Creating auth.verify_session_v3...');
        await client.query(`
            CREATE OR REPLACE FUNCTION auth.verify_session_v3(p_session_token TEXT)
            RETURNS TABLE(user_id UUID, res_email VARCHAR, res_role VARCHAR, res_full_name VARCHAR) AS $$
            BEGIN
                RETURN QUERY
                SELECT 
                    u.id AS user_id, 
                    u.email AS res_email, 
                    u.role AS res_role, 
                    u.full_name AS res_full_name
                FROM auth.sessions s
                JOIN auth.users u ON s.user_id = u.id
                WHERE s.session_token = p_session_token
                AND s.expires_at > NOW();
            END;
            $$ LANGUAGE plpgsql;
        `);

        console.log('\n==================================================');
        console.log('✅ V2 & V3 FUNCTIONS CREATED SUCCESSFULLY');
        console.log('==================================================');

    } catch (error) {
        console.error('❌ Setup failed:', error);
    } finally {
        await client.end();
    }
}

setup();
