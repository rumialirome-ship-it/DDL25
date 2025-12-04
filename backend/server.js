// Environment variables are loaded by the node -r dotenv/config command.
// This ensures they are available before any other code is executed.
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./database/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const drawRoutes = require('./routes/drawRoutes');
const clientRoutes = require('./routes/clientRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize application-level state for market override
app.set('marketOverride', 'AUTO');

const checkDatabaseAndStartServer = async () => {
    try {
        // Log the current server time on startup for easier clock-skew diagnosis
        console.log(`🚀 Current Server Time (UTC): ${new Date().toUTCString()}`);

        const connection = await db.getConnection();
        console.log('Verifying database connection and schema...');
        
        const [dbNameRows] = await connection.query('SELECT DATABASE() as db');
        console.log("--> Server is connected to database:", dbNameRows[0].db);

        const requiredTables = ['admins', 'clients', 'draws', 'bets', 'transactions', 'settings'];
        const [tableRows] = await connection.query('SHOW TABLES');
        const existingTables = tableRows.map(row => Object.values(row)[0]);
        connection.release();

        const missingTables = requiredTables.filter(table => !existingTables.includes(table));

        if (missingTables.length > 0) {
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            console.error('!!! FATAL: DATABASE SCHEMA IS MISSING OR INCOMPLETE !!!');
            console.error(`!!! Missing tables: ${missingTables.join(', ')}`);
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            console.error('Please run the database setup script from the `backend` directory:');
            console.error('>>> npm run db:seed <<<');
            console.error('Then, restart the application.');
            process.exit(1);
        }
        
        console.log('✅ Database schema verified successfully.');

        // If check passes, configure routes and start server
        
        // API Routes
        app.use('/api/auth', authRoutes);
        app.use('/api/draws', drawRoutes);
        app.use('/api/client', clientRoutes);
        app.use('/api/admin', adminRoutes);

        // --- Static File Serving for Frontend ---
        const buildPath = path.join(__dirname, '..', 'dist');
        app.use(express.static(buildPath));
        
        // --- SPA Fallback ---
        app.get('*', (req, res) => {
            res.sendFile(path.join(buildPath, 'index.html'));
        });

        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

    } catch (error) {
        // This will catch connection errors or permissions issues
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('!!! FATAL: COULD NOT CONNECT TO OR QUERY THE DATABASE !!!');
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('Please check your .env and ecosystem.config.js files and ensure your MySQL server is running with correct credentials.');
        console.error('Error details:', error.message);
        process.exit(1);
    }
};

// Run the check and start the server
checkDatabaseAndStartServer();