const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { normalizeClientData } = require('../utils/dataHelpers');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

exports.loginUser = async (req, res) => {
    const { loginIdentifier, password, role } = req.body;

    try {
        let user;
        if (role === 'ADMIN') {
            const [rows] = await db.execute('SELECT * FROM admins WHERE username = ?', [loginIdentifier]);
            user = rows[0];
        } else { // 'CLIENT'
            const [rows] = await db.execute('SELECT * FROM clients WHERE (username = ? OR clientId = ?)', [loginIdentifier, loginIdentifier]);
            user = rows[0];
        }

        if (!user) {
            console.error(`Login failed. Reason: User not found for login identifier "${loginIdentifier}" with role "${role}".`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // In MySQL, boolean is often stored as 1 (true) or 0 (false)
        if (role === 'CLIENT' && user.isActive === 0) {
            return res.status(403).json({ message: 'Your account has been suspended.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            res.json({
                id: user.id,
                clientId: user.clientId,
                username: user.username,
                role: user.role,
                token: generateToken(user.id),
            });
        } else {
            console.error(`Login failed. Reason: Password mismatch for user "${loginIdentifier}".`);
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

// New function to fetch current user data based on token
exports.getMe = async (req, res) => {
    try {
        let user;
        // The `protect` middleware has already identified the user and their role.
        if (req.user.role === 'ADMIN') {
            const [rows] = await db.execute("SELECT * FROM admins WHERE id = ?", [req.user.id]);
            user = rows[0];
        } else { // 'CLIENT'
            const [rows] = await db.execute("SELECT * FROM clients WHERE id = ?", [req.user.id]);
            user = rows[0];
        }
        
        if (!user) {
            // This case should be rare if the token is valid, but it's good practice.
            return res.status(404).json({ message: "User associated with token not found." });
        }

        res.json(normalizeClientData(user));

    } catch (error) {
        console.error("GetMe error:", error);
        res.status(500).json({ message: "Server error while fetching user data." });
    }
};