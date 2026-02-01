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
    ssl: { rejectUnauthorized: false }
});

async function setup() {
    console.log('Starting Full Neon Auth Setup...');

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
        await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth.sessions(expires_at)');

        // 4. Add images column to products table if it doesn't exist
        console.log('Adding images column to products table...');
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb`);

        // 5. Create Helper Functions
        console.log('Creating helper functions...');

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

        // auth.verify_user (original) - DROP first to allow return type change
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

        // auth.verify_user_v3 (used by API)
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

        // auth.verify_session (original) - DROP first
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

        // auth.verify_session_v3 (used by API)
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

        // 6. Create performance indexes for products and orders
        console.log('Creating performance indexes...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_slug)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_active = true');
        await client.query('CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC)');

        // Orders indexes (if table exists)
        try {
            await client.query('CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(phone)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id)');
        } catch (e) {
            console.log('Note: Orders table indexes skipped (table may not exist yet)');
        }

        // 7. Create admin user if not exists
        console.log('Ensuring admin user exists...');
        await client.query(`
            INSERT INTO auth.users (email, password_hash, role, full_name)
            VALUES ('admin@nongor.com', crypt('nongor@2025', gen_salt('bf', 10)), 'admin', 'Nongor Administrator')
            ON CONFLICT (email) DO NOTHING
        `);

        console.log('\n==================================================');
        console.log('✅ FULL SETUP COMPLETE');
        console.log('   - Auth schema and tables created');
        console.log('   - Helper functions (v1, v3) created');
        console.log('   - Images column added to products');
        console.log('   - Performance indexes created');
        console.log('   - Admin user ensured');
        console.log('==================================================');

    } catch (error) {
        console.error('❌ Setup failed:', error);
    } finally {
        await client.end();
    }
}

setup();
