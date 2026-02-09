// Quick script to generate bcrypt hash
const bcrypt = require('bcryptjs');

const password = 'TemporaryPass123!';

bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, (err, hash) => {
        console.log('\n========================================');
        console.log('Password:', password);
        console.log('Bcrypt Hash:', hash);
        console.log('========================================');
        console.log('\nRun this SQL in Neon to update:');
        console.log(`UPDATE admin_users SET password_hash = '${hash}' WHERE username = 'admin';`);
        console.log('========================================\n');
    });
});
