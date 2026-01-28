const { Client } = require('pg');

// Hardcoded to ensure it works
const connectionString = "postgresql://neondb_owner:npg_aXlrxhuS9GR8@ep-plain-art-aez29oyf-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function setup() {
    console.log('Starting Full Neon Auth Setup (Fixing Ambiguity)...');

    try {
        await client.connect();

        // 1. Create auth schema and extension
        console.log('Creating schema and extension...');
        await client.query('CREATE SCHEMA IF NOT EXISTS auth');
        await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

        // 2. Create users table
        console.log('Creating users table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS auth.users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                full_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP
            )
        `);
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email)');

        // 3. Create sessions table
        console.log('Creating sessions table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS auth.sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                session_token TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                ip_address VARCHAR(45),
                user_agent TEXT
            )
        `);
        await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth.sessions(session_token)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth.sessions(user_id)');

        // 4. Create Helper Functions
        console.log('Recreating helper functions...');

        // auth.create_user
        await client.query(`
            CREATE OR REPLACE FUNCTION auth.create_user(
                p_email VARCHAR(255),
                p_password TEXT,
                p_role VARCHAR(50) DEFAULT 'user',
                p_full_name VARCHAR(255) DEFAULT NULL
            )
            RETURNS UUID AS $$
            DECLARE
                v_user_id UUID;
            BEGIN
                INSERT INTO auth.users (email, password_hash, role, full_name)
                VALUES (
                    LOWER(p_email),
                    crypt(p_password, gen_salt('bf', 10)),
                    p_role,
                    p_full_name
                )
                ON CONFLICT (email) DO UPDATE 
                SET password_hash = crypt(p_password, gen_salt('bf', 10)),
                    role = p_role,
                    full_name = p_full_name
                RETURNING id INTO v_user_id;
                
                RETURN v_user_id;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // auth.verify_user - DROP first to allow return type change
        await client.query('DROP FUNCTION IF EXISTS auth.verify_user(VARCHAR, TEXT)');
        await client.query(`
            CREATE OR REPLACE FUNCTION auth.verify_user(
                p_email VARCHAR(255),
                p_password TEXT
            )
            RETURNS TABLE(user_id UUID, res_email VARCHAR, res_role VARCHAR, res_full_name VARCHAR) AS $$
            BEGIN
                RETURN QUERY
                SELECT u.id, u.email, u.role, u.full_name
                FROM auth.users u
                WHERE LOWER(u.email) = LOWER(p_email)
                AND u.password_hash = crypt(p_password, u.password_hash);
                
                -- Update last login
                IF FOUND THEN
                    UPDATE auth.users
                    SET last_login = NOW()
                    WHERE LOWER(auth.users.email) = LOWER(p_email);
                END IF;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // auth.create_session
        await client.query(`
            CREATE OR REPLACE FUNCTION auth.create_session(
                p_user_id UUID,
                p_session_token TEXT,
                p_expires_at TIMESTAMP,
                p_ip_address VARCHAR(45) DEFAULT NULL,
                p_user_agent TEXT DEFAULT NULL
            )
            RETURNS UUID AS $$
            DECLARE
                v_session_id UUID;
            BEGIN
                INSERT INTO auth.sessions (user_id, session_token, expires_at, ip_address, user_agent)
                VALUES (p_user_id, p_session_token, p_expires_at, p_ip_address, p_user_agent)
                RETURNING id INTO v_session_id;
                
                RETURN v_session_id;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // auth.verify_session - DROP first
        await client.query('DROP FUNCTION IF EXISTS auth.verify_session(TEXT)');
        await client.query(`
            CREATE OR REPLACE FUNCTION auth.verify_session(p_session_token TEXT)
            RETURNS TABLE(user_id UUID, res_email VARCHAR, res_role VARCHAR, res_full_name VARCHAR) AS $$
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

        // auth.delete_session
        await client.query(`
            CREATE OR REPLACE FUNCTION auth.delete_session(p_session_token TEXT)
            RETURNS BOOLEAN AS $$
            BEGIN
                DELETE FROM auth.sessions WHERE session_token = p_session_token;
                RETURN FOUND;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // auth.clean_expired_sessions
        await client.query(`
            CREATE OR REPLACE FUNCTION auth.clean_expired_sessions()
            RETURNS INTEGER AS $$
            DECLARE
                v_deleted INTEGER;
            BEGIN
                DELETE FROM auth.sessions WHERE expires_at < NOW();
                GET DIAGNOSTICS v_deleted = ROW_COUNT;
                RETURN v_deleted;
            END;
            $$ LANGUAGE plpgsql;
        `);

        console.log('\n==================================================');
        console.log('✅ RE-SETUP COMPLETE: Functions updated with new return names.');
        console.log('==================================================');

    } catch (error) {
        console.error('❌ Setup failed:', error);
    } finally {
        await client.end();
    }
}

setup();
