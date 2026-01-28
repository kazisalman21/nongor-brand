# 🔐 NEON AUTH IMPLEMENTATION GUIDE - COMPLETE TUTORIAL

## 📋 OVERVIEW

This guide will show you how to implement Neon Auth for your Nongor website admin panel. Neon Auth is simpler than JWT and integrates directly with your Neon PostgreSQL database.

**Time to complete:** 2-3 hours  
**Difficulty:** Medium  
**Replaces:** Part 1, Task 1 from the implementation guide (JWT authentication)

---

## 🎯 WHAT YOU'LL BUILD

- ✅ Secure admin login page
- ✅ Session-based authentication
- ✅ Protected admin routes
- ✅ Automatic session expiration
- ✅ Logout functionality
- ✅ "Remember me" option

---

## STEP 1: ENABLE NEON AUTH IN YOUR DASHBOARD

### 1.1 Open Neon Console

1. Go to https://console.neon.tech/
2. Select your `Nongor` project
3. You should see the "Neon Auth" screen (from your screenshot)

### 1.2 Click "Open quickstart"

This will guide you through initial setup. It will:
- Create the `auth` schema in your database
- Set up required tables (users, sessions)
- Install necessary PostgreSQL extensions

### 1.3 Complete the Quickstart Wizard

Follow the on-screen instructions. This typically involves:
- Enabling the authentication extension
- Creating the auth schema
- Setting up initial admin user

**Screenshot reference:** The screen you showed says "Waiting for someone to sign up to your app" - we'll create the admin user manually.

---

## STEP 2: SET UP DATABASE SCHEMA

### 2.1 Connect to Neon SQL Editor

1. In Neon console, click **"SQL Editor"** tab
2. Make sure you're connected to your database

### 2.2 Create Auth Schema (if not done automatically)

```sql
-- Create auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 2.3 Create Users Table

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON auth.users(email);
```

### 2.4 Create Sessions Table

```sql
-- Create sessions table
CREATE TABLE IF NOT EXISTS auth.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Create indexes
CREATE INDEX idx_sessions_token ON auth.sessions(session_token);
CREATE INDEX idx_sessions_user_id ON auth.sessions(user_id);
CREATE INDEX idx_sessions_expires ON auth.sessions(expires_at);
```

### 2.5 Create Helper Functions

```sql
-- Function to create a new user
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
    RETURNING id INTO v_user_id;
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to verify user credentials
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
    UPDATE auth.users
    SET last_login = NOW()
    WHERE LOWER(email) = LOWER(p_email);
END;
$$ LANGUAGE plpgsql;

-- Function to create session
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

-- Function to verify session
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

-- Function to delete session (logout)
CREATE OR REPLACE FUNCTION auth.delete_session(p_session_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM auth.sessions WHERE session_token = p_session_token;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired sessions (run periodically)
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
```

### 2.6 Create Admin User

```sql
-- Create admin user for Nongor
SELECT auth.create_user(
    'admin@nongor.com',           -- Email
    'YourSecurePassword123!',     -- Password (CHANGE THIS!)
    'admin',                      -- Role
    'Nongor Administrator'        -- Full name
);

-- Verify admin user was created
SELECT id, email, role, full_name, created_at 
FROM auth.users 
WHERE role = 'admin';
```

**⚠️ IMPORTANT:** Change `'YourSecurePassword123!'` to your actual admin password!

---

## STEP 3: INSTALL DEPENDENCIES

```bash
npm install @neondatabase/serverless
```

Update `package.json`:

```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "tailwindcss": "^3.4.1",
    "@neondatabase/serverless": "^0.9.0"
  }
}
```

---

## STEP 4: CREATE AUTHENTICATION API

Create new file: `api/auth.js`

```javascript
import { neon } from '@neondatabase/serverless';

// Initialize Neon client
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            message: 'Method not allowed' 
        });
    }

    const { action, email, password, sessionToken } = req.body;

    try {
        // ============================================
        // ACTION: LOGIN
        // ============================================
        if (action === 'login') {
            // Validate input
            if (!email || !password) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email and password are required' 
                });
            }

            // Verify user credentials
            const userResult = await sql`
                SELECT * FROM auth.verify_user(${email}, ${password})
            `;

            if (userResult.length === 0) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid email or password' 
                });
            }

            const user = userResult[0];

            // Check if user is admin
            if (user.role !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Access denied: Admin only' 
                });
            }

            // Generate session token
            const newSessionToken = generateSecureToken();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Get IP and User Agent
            const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'] || '';

            // Create session
            await sql`
                SELECT auth.create_session(
                    ${user.user_id}::uuid,
                    ${newSessionToken},
                    ${expiresAt.toISOString()},
                    ${ipAddress},
                    ${userAgent}
                )
            `;

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                sessionToken: newSessionToken,
                user: {
                    id: user.user_id,
                    email: user.email,
                    role: user.role,
                    fullName: user.full_name
                },
                expiresAt: expiresAt.toISOString()
            });
        }

        // ============================================
        // ACTION: VERIFY SESSION
        // ============================================
        if (action === 'verify') {
            if (!sessionToken) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Session token is required' 
                });
            }

            // Verify session
            const sessionResult = await sql`
                SELECT * FROM auth.verify_session(${sessionToken})
            `;

            if (sessionResult.length === 0) {
                return res.status(401).json({ 
                    success: false, 
                    valid: false,
                    message: 'Invalid or expired session' 
                });
            }

            const user = sessionResult[0];

            return res.status(200).json({
                success: true,
                valid: true,
                user: {
                    id: user.user_id,
                    email: user.email,
                    role: user.role,
                    fullName: user.full_name
                }
            });
        }

        // ============================================
        // ACTION: LOGOUT
        // ============================================
        if (action === 'logout') {
            if (!sessionToken) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Session token is required' 
                });
            }

            // Delete session
            await sql`
                SELECT auth.delete_session(${sessionToken})
            `;

            return res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });
        }

        // ============================================
        // ACTION: CHANGE PASSWORD
        // ============================================
        if (action === 'changePassword') {
            const { currentPassword, newPassword } = req.body;

            if (!sessionToken || !currentPassword || !newPassword) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Missing required fields' 
                });
            }

            // Verify session first
            const sessionResult = await sql`
                SELECT * FROM auth.verify_session(${sessionToken})
            `;

            if (sessionResult.length === 0) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid session' 
                });
            }

            const user = sessionResult[0];

            // Verify current password
            const verifyResult = await sql`
                SELECT * FROM auth.verify_user(${user.email}, ${currentPassword})
            `;

            if (verifyResult.length === 0) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Current password is incorrect' 
                });
            }

            // Update password
            await sql`
                UPDATE auth.users
                SET password_hash = crypt(${newPassword}, gen_salt('bf', 10)),
                    updated_at = NOW()
                WHERE id = ${user.user_id}::uuid
            `;

            return res.status(200).json({
                success: true,
                message: 'Password changed successfully'
            });
        }

        // Unknown action
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid action' 
        });

    } catch (error) {
        console.error('Auth API error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
    }
}

// Helper function to generate secure token
function generateSecureToken() {
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array);
    } else {
        // Fallback for Node.js
        const nodeCrypto = require('crypto');
        nodeCrypto.randomFillSync(array);
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
```

---

## STEP 5: UPDATE ADMIN.HTML - ADD LOGIN SCREEN

Replace the authentication section in `admin.html`:

```html
<!DOCTYPE html>
<html lang="bn">
<head>
    <!-- Keep existing head content -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nongor Admin | Login</title>
    <link href="./assets/styles.css" rel="stylesheet">
    
    <style>
        /* Keep existing styles */
    </style>
</head>

<body class="bg-gradient-to-br from-brand-admin-dark to-brand-sidebar min-h-screen">

    <!-- ===================================== -->
    <!-- LOGIN SCREEN (Initially visible)      -->
    <!-- ===================================== -->
    <div id="login-screen" class="min-h-screen flex items-center justify-center p-6">
        <div class="max-w-md w-full">
            <!-- Logo & Title -->
            <div class="text-center mb-8 animate-fade-in">
                <img src="./assets/logo.jpeg" alt="Nongor" class="h-20 mx-auto rounded-xl shadow-2xl mb-4">
                <h1 class="text-3xl font-bold text-white mb-2">নোঙর Admin</h1>
                <p class="text-gray-400">Secure Dashboard Access</p>
            </div>

            <!-- Login Card -->
            <div class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 animate-scale-in">
                <form id="login-form" class="space-y-6" onsubmit="handleLogin(event)">
                    <!-- Email Input -->
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                        <input 
                            type="email" 
                            id="login-email" 
                            required
                            autocomplete="email"
                            placeholder="admin@nongor.com"
                            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-brand-accent outline-none transition"
                        >
                    </div>

                    <!-- Password Input -->
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-2">Password</label>
                        <div class="relative">
                            <input 
                                type="password" 
                                id="login-password" 
                                required
                                autocomplete="current-password"
                                placeholder="Enter your password"
                                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-brand-accent outline-none transition pr-12"
                            >
                            <button 
                                type="button" 
                                onclick="togglePassword()"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                            >
                                <svg id="eye-icon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Remember Me -->
                    <div class="flex items-center">
                        <input 
                            type="checkbox" 
                            id="remember-me" 
                            class="w-4 h-4 text-brand-accent border-gray-300 rounded focus:ring-brand-accent"
                        >
                        <label for="remember-me" class="ml-2 text-sm text-gray-700">
                            Remember me for 30 days
                        </label>
                    </div>

                    <!-- Error Message -->
                    <div id="login-error" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"></div>

                    <!-- Login Button -->
                    <button 
                        type="submit"
                        id="login-btn"
                        class="w-full bg-brand-accent hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all transform hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span id="login-btn-text">Login to Dashboard</span>
                        <span id="login-btn-loading" class="hidden">
                            <svg class="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </span>
                    </button>
                </form>

                <!-- Additional Links -->
                <div class="mt-6 text-center">
                    <p class="text-xs text-gray-500">
                        Having trouble logging in? Contact support
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <p class="text-center text-gray-500 text-xs mt-6">
                © 2025 Nongor Brand. All rights reserved.
            </p>
        </div>
    </div>

    <!-- ===================================== -->
    <!-- ADMIN DASHBOARD (Hidden initially)    -->
    <!-- ===================================== -->
    <div id="admin-dashboard" class="hidden">
        <!-- Your existing admin panel HTML goes here -->
        <!-- Don't change anything in the dashboard itself -->
        
        <!-- Just add a logout button in the header -->
        <header class="bg-white shadow-sm sticky top-0 z-40">
            <div class="flex justify-between items-center px-6 py-4">
                <h1 class="text-2xl font-bold text-brand-admin-dark">Dashboard</h1>
                
                <!-- Add this logout button -->
                <button 
                    onclick="handleLogout()"
                    class="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    Logout
                </button>
            </div>
        </header>
        
        <!-- Rest of your admin panel -->
    </div>

    <!-- ===================================== -->
    <!-- AUTHENTICATION JAVASCRIPT             -->
    <!-- ===================================== -->
    <script>
        const API_URL = '/api';
        const AUTH_API_URL = '/api/auth';

        // ============================================
        // CHECK AUTHENTICATION ON PAGE LOAD
        // ============================================
        async function checkAuth() {
            const sessionToken = localStorage.getItem('nongor_session_token');
            
            if (!sessionToken) {
                showLoginScreen();
                return;
            }

            try {
                const response = await fetch(AUTH_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        action: 'verify', 
                        sessionToken 
                    })
                });

                const data = await response.json();

                if (data.success && data.valid) {
                    // Store user info
                    localStorage.setItem('nongor_user', JSON.stringify(data.user));
                    showAdminDashboard();
                    initializeAdminPanel(); // Your existing init function
                } else {
                    localStorage.removeItem('nongor_session_token');
                    localStorage.removeItem('nongor_user');
                    showLoginScreen();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                showLoginScreen();
            }
        }

        // ============================================
        // HANDLE LOGIN FORM SUBMISSION
        // ============================================
        async function handleLogin(event) {
            event.preventDefault();

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const rememberMe = document.getElementById('remember-me').checked;
            
            const errorDiv = document.getElementById('login-error');
            const btnText = document.getElementById('login-btn-text');
            const btnLoading = document.getElementById('login-btn-loading');
            const loginBtn = document.getElementById('login-btn');

            // Show loading state
            btnText.classList.add('hidden');
            btnLoading.classList.remove('hidden');
            loginBtn.disabled = true;
            errorDiv.classList.add('hidden');

            try {
                const response = await fetch(AUTH_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'login',
                        email,
                        password
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Store session token
                    localStorage.setItem('nongor_session_token', data.sessionToken);
                    localStorage.setItem('nongor_user', JSON.stringify(data.user));

                    // Show success message
                    errorDiv.classList.remove('hidden', 'bg-red-50', 'border-red-200', 'text-red-700');
                    errorDiv.classList.add('bg-green-50', 'border-green-200', 'text-green-700');
                    errorDiv.textContent = '✓ Login successful! Redirecting...';

                    // Redirect to dashboard
                    setTimeout(() => {
                        showAdminDashboard();
                        initializeAdminPanel();
                    }, 1000);

                } else {
                    // Show error
                    errorDiv.classList.remove('hidden');
                    errorDiv.textContent = '✗ ' + (data.message || 'Login failed');
                    btnText.classList.remove('hidden');
                    btnLoading.classList.add('hidden');
                    loginBtn.disabled = false;
                }

            } catch (error) {
                console.error('Login error:', error);
                errorDiv.classList.remove('hidden');
                errorDiv.textContent = '✗ Connection error. Please try again.';
                btnText.classList.remove('hidden');
                btnLoading.classList.add('hidden');
                loginBtn.disabled = false;
            }
        }

        // ============================================
        // HANDLE LOGOUT
        // ============================================
        async function handleLogout() {
            if (!confirm('Are you sure you want to logout?')) {
                return;
            }

            const sessionToken = localStorage.getItem('nongor_session_token');

            try {
                await fetch(AUTH_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'logout',
                        sessionToken
                    })
                });
            } catch (error) {
                console.error('Logout error:', error);
            }

            // Clear local storage
            localStorage.removeItem('nongor_session_token');
            localStorage.removeItem('nongor_user');

            // Show login screen
            showLoginScreen();
        }

        // ============================================
        // HELPER: AUTHENTICATED FETCH
        // ============================================
        async function authenticatedFetch(url, options = {}) {
            const sessionToken = localStorage.getItem('nongor_session_token');

            if (!sessionToken) {
                handleLogout();
                throw new Error('No session token');
            }

            const headers = {
                ...options.headers,
                'Authorization': `Bearer ${sessionToken}`,
                'X-Session-Token': sessionToken
            };

            const response = await fetch(url, { ...options, headers });

            if (response.status === 401) {
                handleLogout();
                throw new Error('Session expired');
            }

            return response;
        }

        // ============================================
        // UI HELPER FUNCTIONS
        // ============================================
        function showLoginScreen() {
            document.getElementById('login-screen').classList.remove('hidden');
            document.getElementById('admin-dashboard').classList.add('hidden');
            // Clear form
            document.getElementById('login-form').reset();
        }

        function showAdminDashboard() {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('admin-dashboard').classList.remove('hidden');
        }

        function togglePassword() {
            const passwordInput = document.getElementById('login-password');
            const eyeIcon = document.getElementById('eye-icon');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>';
            } else {
                passwordInput.type = 'password';
                eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
            }
        }

        // ============================================
        // INITIALIZE ON PAGE LOAD
        // ============================================
        document.addEventListener('DOMContentLoaded', () => {
            checkAuth();
        });

        // ============================================
        // UPDATE ALL ADMIN API CALLS
        // ============================================
        // Replace all your admin panel fetch calls with authenticatedFetch
        // Example:
        // OLD: fetch(API_URL + '?action=getAllOrders')
        // NEW: authenticatedFetch(API_URL + '?action=getAllOrders')
    </script>

    <!-- Your existing admin panel scripts -->
</body>
</html>
```

---

## STEP 6: UPDATE MAIN API TO VERIFY SESSION

In `api/index.js`, add session verification for admin routes:

```javascript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function verifySession(req) {
    const sessionToken = req.headers['x-session-token'] || 
                        req.headers['authorization']?.replace('Bearer ', '');

    if (!sessionToken) {
        return { valid: false, error: 'No session token' };
    }

    try {
        const result = await sql`
            SELECT * FROM auth.verify_session(${sessionToken})
        `;

        if (result.length === 0) {
            return { valid: false, error: 'Invalid session' };
        }

        return { valid: true, user: result[0] };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action } = req.query;

    // List of admin-only actions
    const adminActions = [
        'getAllOrders',
        'updateOrderStatus',
        'deleteProduct',
        'addProduct',
        'updateProduct'
    ];

    // Verify session for admin actions
    if (adminActions.includes(action)) {
        const auth = await verifySession(req);

        if (!auth.valid) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: ' + auth.error
            });
        }

        // Check if user is admin
        if (auth.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Admin access required'
            });
        }
    }

    // ... rest of your existing API code ...
}
```

---

## STEP 7: ENVIRONMENT VARIABLES

Add to Vercel/Netlify:

```env
DATABASE_URL=your-neon-connection-string
```

You can find your connection string in Neon console → Connection Details

Format: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

---

## STEP 8: UPDATE ADMIN API CALLS

In your existing admin panel code, replace all fetch calls with `authenticatedFetch`:

**Before:**
```javascript
const response = await fetch(API_URL + '?action=getAllOrders');
```

**After:**
```javascript
const response = await authenticatedFetch(API_URL + '?action=getAllOrders');
```

Do this for:
- `getAllOrders`
- `updateOrderStatus`
- `deleteProduct`
- `addProduct`
- `updateProduct`

---

## STEP 9: TEST THE IMPLEMENTATION

### 9.1 Test Login

1. Deploy your changes
2. Go to `admin.html`
3. Enter credentials:
   - Email: `admin@nongor.com`
   - Password: (what you set in Step 2.6)
4. Click "Login to Dashboard"
5. Should redirect to admin panel

### 9.2 Test Session Persistence

1. Close browser
2. Open `admin.html` again
3. Should automatically log you in (if session valid)

### 9.3 Test Logout

1. Click "Logout" button
2. Should redirect to login screen
3. Should require login again

### 9.4 Test Protected Routes

1. Try accessing admin API without login
2. Should return 401 Unauthorized

---

## STEP 10: CLEANUP (OPTIONAL)

### 10.1 Add Session Cleanup Cron Job

Create `api/cron/cleanup-sessions.js`:

```javascript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    try {
        const result = await sql`
            SELECT auth.clean_expired_sessions()
        `;

        return res.json({
            success: true,
            deletedSessions: result[0].clean_expired_sessions
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
```

Set up Vercel Cron to run daily (in `vercel.json`):

```json
{
  "crons": [{
    "path": "/api/cron/cleanup-sessions",
    "schedule": "0 0 * * *"
  }]
}
```

---

## ✅ TESTING CHECKLIST

- [ ] Admin user created in database
- [ ] Login page displays correctly
- [ ] Valid credentials allow login
- [ ] Invalid credentials show error
- [ ] Session persists after page refresh
- [ ] Logout button works
- [ ] Protected API routes require authentication
- [ ] Session expires after 24 hours
- [ ] Password visibility toggle works
- [ ] "Remember me" option works

---

## 🔧 TROUBLESHOOTING

### "Connection failed"
→ Check `DATABASE_URL` in environment variables

### "Invalid email or password"
→ Verify admin user was created correctly in Step 2.6

### "No session token"
→ Check that `authenticatedFetch` is being used for admin API calls

### "Session expired" immediately
→ Check that `expires_at` is being set correctly (24 hours from now)

### Login works but dashboard doesn't load
→ Make sure `initializeAdminPanel()` function exists and is being called

---

## 🎯 ADVANTAGES OVER JWT

1. **Simpler code** - No JWT libraries needed
2. **Database-backed** - Can revoke sessions instantly
3. **Built into Neon** - Leverages your existing database
4. **Better security** - Sessions can be audited and managed
5. **User tracking** - Can see IP addresses and devices

---

## 📝 NEXT STEPS

After implementing Neon Auth:

1. ✅ Continue with **Part 2** (Size Guide, Emails, etc.)
2. ✅ Skip the JWT implementation in Part 1
3. ✅ Use `authenticatedFetch` for all admin operations

---

**Congratulations! 🎉** You now have secure Neon Auth authentication for your Nongor admin panel!
