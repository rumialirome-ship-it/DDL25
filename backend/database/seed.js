// Explicitly load environment variables from a .env file. This provides a
// robust fallback if the `-r dotenv/config` flag in the npm script fails.
require('dotenv').config();

const path = require('path');
const bcrypt = require('bcryptjs');
const dbPool = require('./db'); // This is the mysql2 pool
const { defaultPrizeRates, defaultCommissionRates } = require(path.resolve(__dirname, '..', 'data', 'defaultRates.js'));

const createTablesSQL = [
    `
    CREATE TABLE IF NOT EXISTS admins (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        wallet DECIMAL(15, 2) DEFAULT 0.00,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(255) PRIMARY KEY,
        clientId VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        wallet DECIMAL(15, 2) DEFAULT 0.00,
        area VARCHAR(255),
        contact VARCHAR(255),
        isActive BOOLEAN DEFAULT TRUE,
        commissionRates JSON,
        prizeRates JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS draws (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        level CHAR(1) NOT NULL,
        drawTime DATETIME NOT NULL,
        status VARCHAR(50) NOT NULL,
        winningNumbers JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_draw_time (drawTime)
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS bets (
        id VARCHAR(255) PRIMARY KEY,
        clientId VARCHAR(255) NOT NULL,
        drawId VARCHAR(255) NOT NULL,
        gameType VARCHAR(50) NOT NULL,
        number VARCHAR(255) NOT NULL,
        stake DECIMAL(15, 2) NOT NULL,
        createdAt DATETIME NOT NULL,
        bettingCondition VARCHAR(50) NOT NULL,
        positions JSON,
        FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (drawId) REFERENCES draws(id) ON DELETE CASCADE
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(255) PRIMARY KEY,
        clientId VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        description VARCHAR(255),
        balanceAfter DECIMAL(15, 2) NOT NULL,
        createdAt DATETIME NOT NULL,
        relatedId VARCHAR(255),
        isReversed BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value VARCHAR(50) NOT NULL
    );
    `
];

// Separate statements for indexes to ensure they are created.
// Running these multiple times is safe; MySQL will error if the index
// exists, but we can ignore that as the end state is correct.
const createIndexesSQL = [
    'CREATE INDEX idx_bets_clientId ON bets(clientId)',
    'CREATE INDEX idx_bets_drawId ON bets(drawId)',
    'CREATE INDEX idx_transactions_clientId ON transactions(clientId)',
    'CREATE INDEX idx_transactions_createdAt ON transactions(createdAt)',
];


async function setupAndSeedDatabase() {
    console.log('Starting full database setup (Schema + Seed/Reset)...');
    let connection;

    try {
        connection = await dbPool.getConnection();
        console.log('Database connection established for setup.');

        const [rows] = await connection.query('SELECT DATABASE() as db');
        console.log("--> Seed script is connected to database:", rows[0].db);

        console.log('Executing CREATE TABLE statements...');
        for (const sql of createTablesSQL) {
            await connection.query(sql);
        }
        console.log('✅ Schema setup complete. Tables created or already exist.');
        
        console.log('Executing CREATE INDEX statements...');
        for (const sql of createIndexesSQL) {
            try {
                await connection.query(sql);
            } catch (error) {
                // Error 1061: Duplicate key name (index already exists)
                if (error.code === 'ER_DUP_KEYNAME' || error.errno === 1061) {
                    console.log(`-> Index already exists, skipping: ${sql}`);
                } else {
                    throw error; // Re-throw other errors
                }
            }
        }
        console.log('✅ Indexes created or already exist.');

        // --- Seed/Verify Settings ---
        console.log('Seeding/Verifying settings...');
        await connection.query(
            "INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('market_override', 'AUTO')"
        );
        console.log('✅ Settings seeded/verified.');

        // --- Force-reset draws for the current lottery cycle ---
        console.log("Force-reseting draws for today's lottery cycle...");

        const now = new Date();
        // A "lottery day" starts when the market opens: 10 AM PKT (UTC+5), which is 05:00 UTC.
        let lotteryDayBoundary = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0, 0));

        let dayStart, dayEnd;
        // This logic mirrors the drawController to operate on the correct set of draws (in UTC).
        if (now.getTime() < lotteryDayBoundary.getTime()) {
            // If it's before 05:00 UTC, we are in the previous day's cycle.
            dayStart = new Date(lotteryDayBoundary);
            dayStart.setUTCDate(dayStart.getUTCDate() - 1);
            dayEnd = lotteryDayBoundary;
        } else {
            // If it's 05:00 UTC or later, we are in the current day's cycle.
            dayStart = lotteryDayBoundary;
            dayEnd = new Date(lotteryDayBoundary);
            dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
        }
        
        console.log(`Operating on lottery day window (UTC): ${dayStart.toISOString()} to ${dayEnd.toISOString()}`);

        // Step 1: Delete all existing draws within this window that are not finalized.
        // This removes any draw that is UPCOMING, OPEN, or CLOSED, ensuring a clean slate.
        const deleteSql = "DELETE FROM draws WHERE drawTime >= ? AND drawTime < ? AND status NOT IN ('FINISHED', 'SUSPENDED')";
        const [deleteResult] = await connection.execute(deleteSql, [dayStart, dayEnd]);
        console.log(`-> Deleted ${deleteResult.affectedRows} non-finalized draws from the current lottery day window.`);

        // Step 2: Insert the correct draw schedule.
        // These are local times in PKT (UTC+5).
        const drawTimesPKT = [
            '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
            '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
        ];
        
        // Using INSERT IGNORE ensures that if a finalized draw somehow remains, this operation won't fail.
        const insertSql = "INSERT IGNORE INTO draws (id, name, level, drawTime, status, winningNumbers) VALUES ?";
        const drawValues = [];
        
        // Get the Year, Month, and Day from the start of the lottery day window (in UTC).
        const lotteryYear = dayStart.getUTCFullYear();
        const lotteryMonth = dayStart.getUTCMonth();
        const lotteryDay = dayStart.getUTCDate();
        
        const datePrefix = `${lotteryYear}-${String(lotteryMonth + 1).padStart(2, '0')}-${String(lotteryDay).padStart(2, '0')}`;

        for (const [index, time] of drawTimesPKT.entries()) {
            const [hours, minutes] = time.split(':').map(Number);
            
            // Convert PKT hours to UTC hours for storage
            const utcHours = hours - 5; 
            
            // Create a Date object from UTC components. This represents the correct point in time.
            const drawTime = new Date(Date.UTC(lotteryYear, lotteryMonth, lotteryDay, utcHours, minutes, 0, 0));

            // Safeguard check to ensure the generated UTC time falls within the correct UTC day window.
            if (drawTime.getTime() >= dayStart.getTime() && drawTime.getTime() < dayEnd.getTime()) {
                 drawValues.push([
                    `draw-${datePrefix}-${index + 1}`,
                    `${index + 1}`,
                    'F',
                    drawTime,
                    'UPCOMING',
                    null
                ]);
            } else {
                console.warn(`[DEBUG] Skipped draw time ${drawTime.toISOString()} as it fell outside the window.`);
            }
        }
        
        if (drawValues.length > 0) {
            await connection.query(insertSql, [drawValues]);
            console.log(`-> Inserted ${drawValues.length} correct draws for the current lottery day.`);
        }
        
        console.log('✅ Draws schedule has been successfully reset.');

        // --- Seed/Update Admin User ---
        const adminUsername = '01';
        const adminPassword = 'password';
        const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
        const adminDefaultWallet = 1000000000.00;

        const [adminRows] = await connection.execute('SELECT id FROM admins WHERE username = ?', [adminUsername]);
        if (adminRows.length === 0) {
            console.log(`Admin user '${adminUsername}' not found. Creating...`);
            const adminId = `admin-${Date.now()}`;
            await connection.execute(
                'INSERT INTO admins (id, username, password, role, wallet) VALUES (?, ?, ?, ?, ?)',
                [adminId, adminUsername, adminHashedPassword, 'ADMIN', adminDefaultWallet]
            );
            console.log(`✅ Admin user '${adminUsername}' created with default password 'password' and wallet of ${adminDefaultWallet}.`);
        } else {
            console.log(`Admin user '${adminUsername}' found. Ensuring default password and wallet are set...`);
            await connection.execute(
                'UPDATE admins SET password = ?, wallet = ? WHERE username = ?',
                [adminHashedPassword, adminDefaultWallet, adminUsername]
            );
            console.log(`✅ Admin user '${adminUsername}' password has been reset to 'password' and wallet reset to ${adminDefaultWallet}.`);
        }
        
        // --- Seed/Update Sample Client User ---
        const clientIdentifier = '02';
        const clientUsername = 'Sample Client';
        const clientPassword = 'password';
        const clientHashedPassword = await bcrypt.hash(clientPassword, 10);
        
        const [clientRows] = await connection.execute('SELECT id FROM clients WHERE clientId = ?', [clientIdentifier]);
        if (clientRows.length === 0) {
            console.log(`Sample client '${clientIdentifier}' not found. Creating...`);
            const clientId = `client-${Date.now()}`;
            await connection.execute(
                `INSERT INTO clients (id, clientId, username, password, role, wallet, area, contact, isActive, commissionRates, prizeRates) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    clientId, clientIdentifier, clientUsername, clientHashedPassword, 'CLIENT',
                    10000, 'Dubai', '123456789', 1,
                    JSON.stringify(defaultCommissionRates),
                    JSON.stringify(defaultPrizeRates)
                ]
            );
            console.log(`✅ Sample client '${clientIdentifier}' created with username '${clientUsername}' and password 'password'.`);
        } else {
             console.log(`Sample client '${clientIdentifier}' found. Ensuring default password is set...`);
             await connection.execute(
                'UPDATE clients SET password = ? WHERE clientId = ?',
                [clientHashedPassword, clientIdentifier]
             );
             console.log(`✅ Sample client '${clientIdentifier}' password has been reset to 'password'.`);
        }
        
        console.log('\nDatabase setup and seed/reset complete!');
        console.log("   IMPORTANT: For security, change default passwords immediately after logging in.");

    } catch (error) {
        console.error('❌ Error during database setup:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.release();
            console.log('Database connection released.');
        }
        await dbPool.end();
        console.log('Setup script finished.');
    }
}

setupAndSeedDatabase();