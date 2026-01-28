const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function generateHash() {
    const password = 'nongor@2025'; // DEFAULT PASSWORD - CHANGE BEFORE USE
    const hash = await bcrypt.hash(password, 10);
    console.log('\n=== COPY THESE TO YOUR ENVIRONMENT VARIABLES ===');
    console.log('ADMIN_PASSWORD_HASH=' + hash);
    console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex'));
    console.log('================================================');
    console.log('NOTE: The default password is "admin". Change it in this script and re-run if you want a custom one.');
}

generateHash();
