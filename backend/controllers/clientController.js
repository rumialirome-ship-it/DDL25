const db = require('../database/db');
const bcrypt = require('bcryptjs');
const { normalizeClientData } = require('../utils/dataHelpers');
const { getDynamicDrawStatus } = require('../utils/drawHelpers');

const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const getClientBets = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT *, bettingCondition as `condition` FROM bets WHERE clientId = ? ORDER BY createdAt DESC", [req.user.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getClientTransactions = async (req, res) => {
     try {
        const [rows] = await db.execute("SELECT * FROM transactions WHERE clientId = ? ORDER BY createdAt DESC", [req.user.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const placeBets = async (req, res) => {
    const { bets: betsToPlace } = req.body;
    const clientId = req.user.id;

    if (!Array.isArray(betsToPlace) || betsToPlace.length === 0) {
        return res.status(400).json({ message: "Bets data is invalid or empty." });
    }

    const connection = await db.getConnection();
    try {
        const [[overrideSetting]] = await connection.query("SELECT setting_value FROM settings WHERE setting_key = 'market_override'");
        const marketOverride = overrideSetting?.setting_value || 'AUTO';

        await connection.beginTransaction();

        const currentTime = new Date();
        const uniqueDrawIds = [...new Set(betsToPlace.map(b => b.drawId))];
        let drawName = 'N/A';

        if (uniqueDrawIds.length > 0) {
            const [draws] = await connection.query('SELECT * FROM draws WHERE id IN (?)', [uniqueDrawIds]);
            const drawMap = new Map(draws.map(d => {
                let finalWinningNumbers = [];
                if (d.winningNumbers && typeof d.winningNumbers === 'string') {
                    try {
                        const parsed = JSON.parse(d.winningNumbers);
                        if (Array.isArray(parsed)) finalWinningNumbers = parsed;
                    } catch (e) { /* ignore */ }
                } else if (Array.isArray(d.winningNumbers)) {
                    finalWinningNumbers = d.winningNumbers;
                }
                return [d.id, { ...d, winningNumbers: finalWinningNumbers }];
            }));

            if (draws.length > 0) {
                drawName = draws[0].name;
            }

            for (const drawId of uniqueDrawIds) {
                const draw = drawMap.get(drawId);
                if (!draw) {
                    throw new Error(`Bet submitted for non-existent Draw ID: ${drawId}.`);
                }
                const status = getDynamicDrawStatus(draw, currentTime, marketOverride);
                if (status !== 'OPEN') {
                    await connection.rollback();
                    return res.status(400).json({ message: `Betting is closed for Draw ${draw.name}. Market status is currently ${status}.` });
                }
            }
        }
        
        const [adminRows] = await connection.execute("SELECT id, wallet FROM admins LIMIT 1 FOR UPDATE");
        if (adminRows.length === 0) throw new Error("System admin account not found.");
        const admin = adminRows[0];

        const [clientRows] = await connection.execute("SELECT * FROM clients WHERE id = ? FOR UPDATE", [clientId]);
        if (clientRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Client not found." });
        }
        const client = clientRows[0];
        const clientData = normalizeClientData(client);

        const totalStake = betsToPlace.reduce((sum, bet) => sum + bet.stake, 0);
        if (client.wallet < totalStake) {
            await connection.rollback();
            return res.status(400).json({ message: `Insufficient funds. Wallet: ${client.wallet.toFixed(2)}, Required: ${totalStake.toFixed(2)}` });
        }
        
        const totalCommission = betsToPlace.reduce((sum, bet) => {
            const rate = clientData.commissionRates[bet.gameType] || 0;
            return sum + (bet.stake * (rate / 100));
        }, 0);
        
        const finalClientBalance = client.wallet - totalStake + totalCommission;
        const finalAdminBalance = parseFloat(admin.wallet) + totalStake - totalCommission;
        
        await connection.execute("UPDATE clients SET wallet = ? WHERE id = ?", [finalClientBalance, clientId]);
        await connection.execute("UPDATE admins SET wallet = ? WHERE id = ?", [finalAdminBalance, admin.id]);
        
        const newTransactions = [];
        
        const balanceAfterStake = client.wallet - totalStake;
        const stakeTransaction = {
            id: `txn-${generateUniqueId()}`, clientId, type: 'DEBIT', amount: totalStake,
            description: `Booking for Draw ${drawName}: ${betsToPlace.length} bet(s)`,
            balanceAfter: balanceAfterStake, createdAt: new Date()
        };
        newTransactions.push(stakeTransaction);
        await connection.execute("INSERT INTO transactions (id, clientId, type, amount, description, balanceAfter, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", Object.values(stakeTransaction));
        
        if (totalCommission > 0) {
            const commissionCreatedAt = new Date(stakeTransaction.createdAt.getTime() + 1);
            const commissionTransaction = {
                id: `txn-${generateUniqueId()}`, clientId, type: 'CREDIT', amount: totalCommission,
                description: `Commission for Draw ${drawName}`,
                balanceAfter: finalClientBalance,
                createdAt: commissionCreatedAt
            };
            newTransactions.push(commissionTransaction);
             await connection.execute("INSERT INTO transactions (id, clientId, type, amount, description, balanceAfter, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", Object.values(commissionTransaction));
        }
        
        const newBets = betsToPlace.map(bet => ({
            id: `bet-${generateUniqueId()}`,
            clientId,
            drawId: bet.drawId,
            gameType: bet.gameType,
            number: bet.number,
            stake: bet.stake,
            createdAt: new Date(),
            condition: bet.condition,
            positions: bet.positions || null
        }));
        
        if (newBets.length > 0) {
            const betInsertSql = "INSERT INTO bets (id, clientId, drawId, gameType, number, stake, createdAt, bettingCondition, positions) VALUES ?";
            const betValues = newBets.map(b => [b.id, b.clientId, b.drawId, b.gameType, b.number, b.stake, b.createdAt, b.condition, JSON.stringify(b.positions)]);
            await connection.query(betInsertSql, [betValues]);
        }
        
        await connection.commit();
        
        const [updatedClientRows] = await db.execute("SELECT * FROM clients WHERE id = ?", [clientId]);

        res.status(201).json({
            message: `${newBets.length} bets placed successfully.`,
            updatedClient: normalizeClientData(updatedClientRows[0]),
            newBets: newBets,
            newTransactions: newTransactions
        });

    } catch (error) {
        await connection.rollback();
        console.error("Place bets error:", error);
        res.status(500).json({ message: error.message || "Transaction failed." });
    } finally {
        connection.release();
    }
};

const updateClientCredentials = async (req, res) => {
    const { currentPassword, newUsername, newPassword } = req.body;
    const clientId = req.user.id;

    if (newPassword && newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long." });
    }
    
    try {
        const [rows] = await db.execute("SELECT * FROM clients WHERE id = ?", [clientId]);
        const client = rows[0];
        if (!client) return res.status(404).json({ message: "Client not found." });

        const isMatch = await bcrypt.compare(currentPassword, client.password);
        if (!isMatch) return res.status(401).json({ message: "Incorrect current password." });

        let sql = 'UPDATE clients SET ';
        const values = [];

        if (newUsername) {
            sql += 'username = ?';
            values.push(newUsername);
        }

        if (newPassword) {
            if(values.length > 0) sql += ', ';
            const hash = await bcrypt.hash(newPassword, 10);
            sql += 'password = ?';
            values.push(hash);
        }

        if (values.length === 0) {
            return res.status(400).json({ message: "No new credentials provided." });
        }
        
        sql += ' WHERE id = ?';
        values.push(clientId);

        await db.execute(sql, values);
        
        const [updatedRows] = await db.execute("SELECT * FROM clients WHERE id = ?", [clientId]);
        res.json(normalizeClientData(updatedRows[0]));

    } catch(error) {
        console.error("Update credentials error:", error);
        res.status(500).json({ message: "Server error while updating credentials." });
    }
};


module.exports = {
    getClientBets,
    getClientTransactions,
    placeBets,
    updateClientCredentials
};