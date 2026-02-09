const bcrypt = require('bcryptjs');

const password = 'TemporaryPass123!';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('HASH:', hash);
