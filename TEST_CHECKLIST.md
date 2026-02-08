# Test Checklist: Admin Change Password Feature

## Pre-requisites
- [ ] Database migration `scripts/migrate_admin_auth.js` has been run.
- [ ] `admin_users` table exists and contains the 'admin' user.
- [ ] Environment variable `ADMIN_PASSWORD` was set during migration (default: 'admin123' if not set, or whatever you used).

## 1. Initial Login
- [ ] Open `admin.html`.
- [ ] Login with user: `admin@nongor.com` and the **current** password (e.g., from env or 'admin123').
- [ ] Verify login is successful and dashboard loads.

## 2. Locate Feature
- [ ] Navigate to the "Settings" tab (newly added).
- [ ] Verify the "Change Password" form is visible.
- [ ] Verify fields: Current Password, New Password, Confirm Password.

## 3. Validation Tests
- [ ] **Mismatch**: Enter 'newpass123' and 'otherpass123'. Click Update.
  - [ ] Expected: Error message "New passwords do not match".
- [ ] **Short Password**: Enter 'short' (less than 12 chars). Click Update.
  - [ ] Expected: Error message "New password must be at least 12 characters...".
- [ ] **Wrong Current**: Enter WRONG current password. Click Update.
  - [ ] Expected: Error message "Invalid current password".

## 4. Successful Change
- [ ] Enter correct Current Password.
- [ ] Enter valid New Password (min 12 chars, e.g., `NewStrongPass@2024!`).
- [ ] Enter same Confirm Password.
- [ ] Click Update.
  - [ ] Expected: Success message "Password updated successfully...".
  - [ ] Expected: Page reloads or redirects to login after ~1.5s.

## 5. Re-authentication
- [ ] Try to access dashboard (refresh page).
  - [ ] Expected: You should be logged out (login screen visible).
- [ ] Try logging in with **OLD** password.
  - [ ] Expected: Login failed ("Invalid email or password").
- [ ] Try logging in with **NEW** password.
  - [ ] Expected: Login successful.

## 6. Security Verification (Optional)
- [ ] Check Database: `SELECT * FROM admin_users;`
  - [ ] Verify `password_hash` has changed.
  - [ ] Verify `password_version` incremented.
  - [ ] Verify `last_password_change` updated.
