     const fs = require('fs');
     const path = require('path');
     const pool = require('./pool');

     (async () => {
       const dir = path.join(__dirname, 'migrations');
       for (const file of fs.readdirSync(dir).sort()) {
         await pool.query(fs.readFileSync(path.join(dir, file), 'utf8'));
         console.log(`Applied ${file}`);
       }
       await pool.end();
     })().catch((e) => { console.error(e); process.exit(1); });