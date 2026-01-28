const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error('Error: DATABASE_URL or NETLIFY_DATABASE_URL is not defined in .env');
    process.exit(1);
}

const sql = neon(connectionString);

function generatePassword(length = 16) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

async function setup() {
    console.log('Starting Neon Auth setup...');

    try {
        // 1. Create auth schema and extension
        console.log('Creating schema and extension...');
        await sql`CREATE SCHEMA IF NOT EXISTS auth`;
        await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

        // 2. Create users table
        console.log('Creating users table...');
        await sql`
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
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email)`;

        // 3. Create sessions table
        console.log('Creating sessions table...');
        await sql`
            CREATE TABLE IF NOT EXISTS auth.sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                session_token TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                ip_address VARCHAR(45),
                user_agent TEXT
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth.sessions(session_token)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth.sessions(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth.sessions(expires_at)`;

        // 4. Create Helper Functions
        console.log('Creating helper functions...');

        // auth.create_user
        await sql`
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
        `;

        // auth.verify_user
        await sql`
            CREATE OR REPLACE FUNCTION auth.verify_user(
                p_email VARCHAR(255),
                p_password TEXT
            )
            RETURNS TABLE(user_id UUID, email VARCHAR, role VARCHAR, full_name VARCHAR) AS $$
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
        `;

        // auth.create_session
        await sql`
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
        `;

        // auth.verify_session
        await sql`
            CREATE OR REPLACE FUNCTION auth.verify_session(p_session_token TEXT)
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
        `;

        // auth.delete_session
        await sql`
            CREATE OR REPLACE FUNCTION auth.delete_session(p_session_token TEXT)
            RETURNS BOOLEAN AS $$
            BEGIN
                DELETE FROM auth.sessions WHERE session_token = p_session_token;
                RETURN FOUND;
            END;
            $$ LANGUAGE plpgsql;
        `;

        // auth.clean_expired_sessions
        await sql`
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
        `;

        // 5. Create Admin User
        console.log('Creating admin user...');
        const adminEmail = 'admin@nongor.com';
        const adminPassword = generatePassword();

        await sql`
            SELECT auth.create_user(
                ${adminEmail},
                ${adminPassword},
                'admin',
                'Nongor Administrator'
            )
        `;

        console.log('\n==================================================');
        console.log('✅ NEON AUTH SETUP COMPLETE');
        console.log('==================================================');
        console.log(`Admin Email:    ${adminEmail}`);
        console.log(`Admin Password: ${adminPassword}`);
        console.log('==================================================');
        console.log('⚠️  SAVE THIS PASSWORD SECURELY! You will need it to login.');
        console.log('==================================================\n');

    } catch (error) {
        console.error('❌ Setup failed:', error);
    }
}

setup();
