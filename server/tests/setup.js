const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.test'), quiet: true });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
