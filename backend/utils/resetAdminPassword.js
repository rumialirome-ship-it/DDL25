// Explicitly load environment variables from a .env file. This is crucial for
// standalone scripts that rely on database credentials.
// We specify the path explicitly to avoid any ambiguity.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

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