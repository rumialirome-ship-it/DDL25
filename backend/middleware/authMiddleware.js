const jwt = require('jsonwebtoken');
const db = require('../database/db');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // First, try to find the user in the clients table.
            const [clientRows] = await db.execute('SELECT id, username, role FROM clients WHERE id = ?', [decoded.id]);
            let user = clientRows[0];

            // If not found, try the admin users table.
            if (!user) {
                const [adminRows] = await db.execute('SELECT id, username, role FROM admins WHERE id = ?', [decoded.id]);
                user = adminRows[0];
            }

            if (!user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            
            req.user = user;
            next();

        } catch (error) {
            console.error("Auth middleware error:", error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };