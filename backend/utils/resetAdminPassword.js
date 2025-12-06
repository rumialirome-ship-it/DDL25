// Explicitly load and check environment variables to diagnose connection issues.
const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
const dotenvResult = require('dotenv').config({ path: envPath });

if (dotenvResult.error) {
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error('!!! [DEBUG] ERROR: Could not load .env file. This is likely the cause of the database connection error.');
  console.error(`!!! Path attempted: ${envPath}`);
  console.error('!!! Please ensure the .env file exists in the /backend directory and has correct read permissions.');
  console.error('!!! Details:', dotenvResult.error);
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
} else {
  console.log(`[DEBUG] Attempting to load environment variables from: ${envPath}`);
  if (Object.keys(dotenvResult.parsed).length === 0) {
    console.warn('[DEBUG] WARNING: .env file was found, but it is empty.');
  } else {
    console.log('✅ [DEBUG] .env file loaded successfully.');
  }
}

const bcrypt = require('bcryptjs');
const dbPool = require('../database/db');

async function resetAdminPassword() {
    console.log('Attempting to reset admin password...');
    let connection;

    try {
        connection = await dbPool.getConnection();
        const adminUsername = '01';
        const newPassword = 'password';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const [userRows] = await connection.execute('SELECT id FROM admins WHERE username = ?', [adminUsername]);
        if (userRows.length === 0) {
            console.error(`❌ ERROR: Admin user "${adminUsername}" not found in the database.`);
            console.error('The admin user needs to be created first. Please run the full database seed script:');
            console.error('>>> npm run db:seed <<<');
            return;
        }

        const [result] = await connection.execute(
            'UPDATE admins SET password = ? WHERE username = ?',
            [hashedPassword, adminUsername]
        );

        if (result.affectedRows > 0) {
            console.log(`✅ Success! Password for admin user "${adminUsername}" has been reset to "password".`);
            console.log('You should now be able to log in.');
        } else {
            // This case should ideally not be reached if the user was found
            console.error('❌ ERROR: Failed to update the password. The user was found but the update operation affected 0 rows.');
        }

    } catch (error) {
        console.error('❌ An error occurred during the password reset process:');
        console.error(error.message);
        console.error('Please check your `backend/.env` file to ensure database credentials are correct.');
    } finally {
        if (connection) await connection.release();
        await dbPool.end();
    }
}

resetAdminPassword();