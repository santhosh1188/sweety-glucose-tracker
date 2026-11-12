const { Pool, types } = require('pg');
const { databaseUrl } = require('../config/env');

// Return DATE columns as 'YYYY-MM-DD' strings, not JS Date objects.
// Otherwise time zone conversion can shift dates by one day.
types.setTypeParser(1082, (val) => val);

module.exports = new Pool({ connectionString: databaseUrl });