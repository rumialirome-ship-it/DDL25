// This script is a diagnostic tool to test the database connection independently.
// It loads the .env file and attempts a single connection to the database pool.
// If this script fails, the issue is confirmed to be with the .env configuration
// or the MySQL server's user/password/privileges, not the main application code.

const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
const dotenvResult = require('dotenv').config({ path: envPath });

if (dotenvResult.error) {
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error('!!! [DIAGNOSTIC TEST] ERROR: Could not load .env file.');
  console.error(`!!! Path attempted: ${envPath}`);
  console.error('!!! Details:', dotenvResult.error);
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  process.exit(1);
} else {
  console.log(`[DIAGNOSTIC TEST] Attempting to load environment variables from: ${envPath}`);
  console.log('✅ [DIAGNOSTIC TEST] .env file loaded successfully.');
}

// The db.js file will print the credentials it's using.
const dbPool = require('../database/db');

async function testConnection() {
    console.log('\n[DIAGNOSTIC TEST] Attempting to connect to the database...');
    let connection;
    try {
        connection = await dbPool.getConnection();
        console.log('✅✅✅ SUCCESS! ✅✅✅');
        console.log('Database connection was successful.');
        
        const [rows] = await connection.query('SELECT DATABASE() as db, USER() as user');
        console.log('Connected to database:', rows[0].db);
        console.log('Authenticated as user:', rows[0].user);
        
        console.log('\nThis confirms your .env file credentials and MySQL user are correct.');
        console.log('If `npm run db:seed` still fails, the problem may be elsewhere, but the connection itself is valid.');

    } catch (error) {
        console.error('❌❌❌ FAILURE! ❌❌❌');
        console.error('Database connection failed. See the error details below.');
        console.error('Error:', error.message);
        console.error('\n--- TROUBLESHOOTING STEPS ---');
        console.error("1. Double-check the DB_HOST, DB_USER, DB_DATABASE, and DB_PASSWORD values in your `backend/.env` file.");
        console.error("2. Ensure your MySQL server is running and accessible.");
        console.error("3. Follow the 'Nuke and Recreate' user steps in the updated README.md to be 100% sure the user and password are correct.");
        process.exit(1);
    } finally {
        if (connection) await connection.release();
        await dbPool.end();
        console.log('\n[DIAGNOSTIC TEST] Test finished.');
    }
}

testConnection();