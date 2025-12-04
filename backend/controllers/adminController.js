const db = require('../database/db');
const bcrypt = require('bcryptjs');
const { isBetWinner } = require('../utils/helpers');
const { generateDrawStats, generateLiveDrawAnalysis } = require('../utils/reportHelpers');
const { normalizeClientData } = require('../utils/dataHelpers');
const { getDynamicDrawStatus } = require('../utils/drawHelpers');

const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

// --- Client Management ---

exports.getAllClients = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM clients");
        res.json(rows.map(normalizeClientData));
    } catch (error) {
        console.error("Error in getAllClients:", error);
        res.status(500).json({ message: "Failed to retrieve clients." });
    }
};

exports.getClientById = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM clients WHERE id = ?", [req.params.id]);
        const client = rows[0];
        if (!client) return res.status(404).json({ message: "Client not found" });
        res.json(normalizeClientData(client));
    } catch (error) {
        console.error("Error in getClientById:", error);
        res.status(500).json({ message: "Failed to retrieve client." });
    }
};

exports.registerClient = async (req, res) => {
    const { clientId, username, password, contact, area, wallet, commissionRates, prizeRates } = req.body;
    
    if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    try {
        const [existing] = await db.execute("SELECT id FROM clients WHERE clientId = ? OR username = ?", [clientId, username]);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Client ID or Username already exists." });
        }
        
        const hash = await bcrypt.hash(password, 10);
        
        const newClient = {
            id: `client-${generateUniqueId()}`,
            clientId, username, password: hash,
            role: 'CLIENT',
            wallet: wallet || 0,
            area: area || null, 
            contact: contact || null,
            isActive: 1, // 1 for true
            commissionRates: JSON.stringify(commissionRates || {}),
            prizeRates: JSON.stringify(prizeRates || {})
        };

        const sql = "INSERT INTO clients (id, clientId, username, password, role, wallet, area, contact, isActive, commissionRates, prizeRates) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        await db.execute(sql, Object.values(newClient));
        
        res.status(201).json(normalizeClientData(newClient));

    } catch (error) {
        console.error("Error in registerClient:", error);
        res.status(500).json({ message: "Failed to register client." });
    }
};

exports.updateClientDetails = async (req, res) => {
    const { id } = req.params;
    const { clientId, username, contact, area, isActive, commissionRates, prizeRates } = req.body;

    try {
        const fields = { clientId, username, contact, area, 
            isActive: isActive !== undefined ? (isActive ? 1 : 0) : undefined,
            commissionRates: commissionRates !== undefined ? JSON.stringify(commissionRates) : undefined,
            prizeRates: prizeRates !== undefined ? JSON.stringify(prizeRates) : undefined
        };
        
        const updates = Object.entries(fields)
            .filter(([, value]) => value !== undefined)
            .map(([key]) => `${key} = ?`);

        if (updates.length === 0) {
            return res.status(400).json({ message: "No update fields provided." });
        }
        
        const values = Object.values(fields).filter(v => v !== undefined);

        const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
        const [result] = await db.execute(sql, [...values, id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: "Client not found." });
        
        const [updatedRows] = await db.execute("SELECT * FROM clients WHERE id = ?", [id]);
        res.json(normalizeClientData(updatedRows[0]));

    } catch (error) {
        console.error("Error in updateClientDetails:", error);
        res.status(500).json({ message: "Failed to update client details." });
    }
};

exports.changeClientPassword = async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
    }
    try {
        const hash = await bcrypt.hash(newPassword, 10);
        const [result] = await db.execute("UPDATE clients SET password = ? WHERE id = ?", [hash, req.params.id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: "Client not found." });
        res.status(204).send();
    } catch (error) {
        console.error("Error in changeClientPassword:", error);
        res.status(500).json({ message: "Failed to change password." });
    }
};

exports.adjustClientWallet = async (req, res) => {
    const { amount, type, description } = req.body;
    const clientId = req.params.id;
    const adminUserId = req.user.id;
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Lock both admin and client for update
        const [adminRows] = await connection.execute("SELECT id, wallet FROM admins WHERE id = ? FOR UPDATE", [adminUserId]);
        const admin = adminRows[0];
        if (!admin) throw new Error("System admin account not found.");

        const [clientRows] = await connection.execute("SELECT wallet FROM clients WHERE id = ? FOR UPDATE", [clientId]);
        const client = clientRows[0];
        if (!client) {
            await connection.rollback();
            return res.status(404).json({ message: "Client not found." });
        }
        const currentClientWallet = parseFloat(client.wallet);
        const currentAdminWallet = parseFloat(admin.wallet);

        let newClientBalance, newAdminBalance;

        if (type === 'CREDIT') { // Deposit to client
            newClientBalance = currentClientWallet + parsedAmount;
            newAdminBalance = currentAdminWallet - parsedAmount; // Debit from admin
            if (newAdminBalance < 0) {
                await connection.rollback();
                return res.status(400).json({ message: "Admin has insufficient funds for this deposit." });
            }
        } else if (type === 'DEBIT') { // Withdraw from client
            if (currentClientWallet < parsedAmount) {
                await connection.rollback();
                return res.status(400).json({ message: "Insufficient funds for withdrawal." });
            }
            newClientBalance = currentClientWallet - parsedAmount;
            newAdminBalance = currentAdminWallet + parsedAmount; // Credit to admin
        } else {
            await connection.rollback();
            return res.status(400).json({ message: "Invalid transaction type specified." });
        }
        
        // Update both wallets
        await connection.execute("UPDATE clients SET wallet = ? WHERE id = ?", [newClientBalance, clientId]);
        await connection.execute("UPDATE admins SET wallet = ? WHERE id = ?", [newAdminBalance, admin.id]);

        // Create client transaction
        const newTransaction = {
            id: `txn-${generateUniqueId()}`,
            clientId,
            type,
            amount: parsedAmount,
            description,
            balanceAfter: newClientBalance,
            createdAt: new Date(),
        };
        await connection.execute(
            "INSERT INTO transactions (id, clientId, type, amount, description, balanceAfter, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
            Object.values(newTransaction)
        );

        await connection.commit();
        
        const [updatedRows] = await connection.execute("SELECT * FROM clients WHERE id = ?", [clientId]);
        res.json(normalizeClientData(updatedRows[0]));

    } catch (error) {
        await connection.rollback();
        console.error("Wallet adjustment error:", error);
        res.status(500).json({ message: "Transaction failed due to a server error." });
    } finally {
        connection.release();
    }
};

// --- Admin Profile ---

exports.updateAdminProfile = async (req, res) => {
    const { currentPassword, newUsername, newPassword } = req.body;
    const adminId = req.user.id;
    
    if (newPassword && newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long." });
    }

    try {
        const [rows] = await db.execute("SELECT * FROM admins WHERE id = ?", [adminId]);
        const admin = rows[0];
        if (!admin) return res.status(404).json({ message: "Admin user not found." });

        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) return res.status(401).json({ message: "Incorrect current password." });

        let sql = 'UPDATE admins SET ';
        const values = [];

        if (newUsername) {
            sql += 'username = ?';
            values.push(newUsername);
        }

        if (newPassword) {
            if (values.length > 0) sql += ', ';
            const hash = await bcrypt.hash(newPassword, 10);
            sql += 'password = ?';
            values.push(hash);
        }

        if (values.length === 0) {
            return res.status(400).json({ message: "No new credentials provided." });
        }
        
        sql += ' WHERE id = ?';
        values.push(adminId);

        await db.execute(sql, values);
        
        const [updatedRows] = await db.execute("SELECT * FROM admins WHERE id = ?", [adminId]);
        res.json(normalizeClientData(updatedRows[0]));

    } catch(error) {
        console.error("Update admin credentials error:", error);
        res.status(500).json({ message: "Server error while updating credentials." });
    }
};

// --- Draw Management ---

exports.setDeclaredNumbers = async (req, res) => {
    const { id: drawId } = req.params;
    const { winningNumbers } = req.body;

    if (!Array.isArray(winningNumbers) || winningNumbers.length !== 4 || winningNumbers.some(n => typeof n !== 'string' || !/^\d{4}$/.test(n))) {
        return res.status(400).json({ message: "Declared numbers must be an array of four 4-digit strings." });
    }

    try {
        const [result] = await db.execute(
            "UPDATE draws SET winningNumbers = ? WHERE id = ?",
            [JSON.stringify(winningNumbers), drawId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Draw not found." });
        }

        res.status(204).send();
    } catch (error) {
        console.error("Set declared numbers error:", error);
        res.status(500).json({ message: "Failed to set declared numbers." });
    }
};

exports.declareWinner = async (req, res) => {
    const { id: drawId } = req.params;
    const { winningNumbers } = req.body;
    const adminUserId = req.user.id;

    if (!Array.isArray(winningNumbers) || winningNumbers.length !== 4 || winningNumbers.some(n => typeof n !== 'string' || !/^\d{4}$/.test(n))) {
        return res.status(400).json({ message: "Winning numbers must be an array of four 4-digit strings." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const [adminRows] = await connection.execute("SELECT id, wallet FROM admins WHERE id = ? FOR UPDATE", [adminUserId]);
        const admin = adminRows[0];
        if (!admin) throw new Error("System admin account not found.");

        const [drawRows] = await connection.execute("SELECT * FROM draws WHERE id = ? FOR UPDATE", [drawId]);
        const drawFromDb = drawRows[0];
        if (!drawFromDb) {
            await connection.rollback();
            return res.status(404).json({ message: "Draw not found." });
        }

        let parsedWinningNumbersFromDb = [];
        if (drawFromDb.winningNumbers && typeof drawFromDb.winningNumbers === 'string') {
            try {
                if (drawFromDb.winningNumbers !== 'null') {
                    parsedWinningNumbersFromDb = JSON.parse(drawFromDb.winningNumbers);
                }
            } catch (e) {
                console.warn(`Invalid JSON in winningNumbers for draw ${drawId} during winner declaration:`, drawFromDb.winningNumbers);
            }
        }
        
        const draw = { ...drawFromDb, winningNumbers: parsedWinningNumbersFromDb };
        
        const currentTime = new Date();
        const marketOverride = req.app.get('marketOverride') || 'AUTO';
        const effectiveStatus = getDynamicDrawStatus(draw, currentTime, marketOverride);

        const isReady = effectiveStatus === 'CLOSED' || effectiveStatus === 'DECLARED';
        const isUpdatable = drawFromDb.status === 'FINISHED';

        if (!isReady && !isUpdatable) {
            await connection.rollback();
            return res.status(400).json({ message: `Cannot finalize draw. The draw's effective status is '${effectiveStatus}', not 'CLOSED', 'DECLARED', or 'FINISHED'.` });
        }

        if (drawFromDb.status === 'FINISHED') {
            const [betsForDraw] = await connection.execute("SELECT id FROM bets WHERE drawId = ?", [drawId]);
            const betIdsForDraw = betsForDraw.map(b => b.id);

            if (betIdsForDraw.length > 0) {
                const [previousTransactions] = await connection.execute(
                    "SELECT * FROM transactions WHERE relatedId IN (?)",
                    [betIdsForDraw]
                );

                let totalReversedAmount = 0;
                for (const tx of previousTransactions) {
                    await connection.execute(
                        "UPDATE clients SET wallet = wallet - ? WHERE id = ?",
                        [tx.amount, tx.clientId]
                    );
                    totalReversedAmount += parseFloat(tx.amount);
                }

                if (previousTransactions.length > 0) {
                    await connection.execute(
                        "DELETE FROM transactions WHERE relatedId IN (?)",
                        [betIdsForDraw]
                    );
                }

                if (totalReversedAmount > 0) {
                    await connection.execute(
                        "UPDATE admins SET wallet = wallet + ? WHERE id = ?",
                        [totalReversedAmount, admin.id]
                    );
                }
            }
        }
        
        await connection.execute(
            "UPDATE draws SET status = 'FINISHED', winningNumbers = ? WHERE id = ?",
            [JSON.stringify(winningNumbers), drawId]
        );

        const [bets] = await connection.execute("SELECT *, bettingCondition as `condition` FROM bets WHERE drawId = ?", [drawId]);
        const [clients] = await connection.query("SELECT * FROM clients");
        const clientMap = new Map(clients.map(c => [c.id, normalizeClientData(c)]));

        let totalSystemPayout = 0;
        
        for (const bet of bets) {
            if (isBetWinner(bet, winningNumbers)) {
                const client = clientMap.get(bet.clientId);
                if (client && client.prizeRates) {
                    const conditionKey = bet.condition.toLowerCase();
                    let rate = 0;

                    if (bet.gameType === 'POSITIONAL') {
                        const digitCount = (bet.number.match(/\d/g) || []).length;
                        if (client.prizeRates.POSITIONAL && client.prizeRates.POSITIONAL[digitCount]) {
                            rate = client.prizeRates.POSITIONAL[digitCount][conditionKey];
                        }
                    } else {
                        if (client.prizeRates[bet.gameType]) {
                            rate = client.prizeRates[bet.gameType][conditionKey];
                        }
                    }

                    if (typeof rate === 'number' && rate > 0) {
                        const winnings = bet.stake * (rate / 100);
                        totalSystemPayout += winnings;

                        const [clientRows] = await connection.execute("SELECT wallet FROM clients WHERE id = ? FOR UPDATE", [bet.clientId]);
                        const newBalance = parseFloat(clientRows[0].wallet) + winnings;
                        await connection.execute("UPDATE clients SET wallet = ? WHERE id = ?", [newBalance, bet.clientId]);
                        
                        const description = `Win on ${bet.number} (${bet.gameType}) in Draw ${draw.name}. Stake ${bet.stake} @ ${rate / 100}x`;
                        
                        const newTransaction = {
                            id: `txn-${generateUniqueId()}`, 
                            clientId: bet.clientId, 
                            type: 'CREDIT', 
                            amount: winnings,
                            description, 
                            balanceAfter: newBalance, 
                            createdAt: new Date(),
                            relatedId: bet.id
                        };
                        await connection.execute(
                            "INSERT INTO transactions (id, clientId, type, amount, description, balanceAfter, createdAt, relatedId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
                            Object.values(newTransaction)
                        );
                    }
                }
            }
        }
        
        if (totalSystemPayout > 0) {
            const newAdminBalance = parseFloat(admin.wallet) - totalSystemPayout;
            await connection.execute("UPDATE admins SET wallet = ? WHERE id = ?", [newAdminBalance, admin.id]);
        }

        await connection.commit();
        res.status(200).json({ message: "Winner declared/updated and payouts processed successfully." });

    } catch (error) {
        await connection.rollback();
        console.error("Declare/update winner error:", error);
        res.status(500).json({ message: "Failed to declare/update winner due to a server error." });
    } finally {
        connection.release();
    }
};

exports.updateDrawTime = async (req, res) => {
    const { id: drawId } = req.params;
    const { newTime } = req.body;

    if (!newTime || isNaN(new Date(newTime).getTime())) {
        return res.status(400).json({ message: "A valid new time is required." });
    }

    try {
        const [result] = await db.execute(
            "UPDATE draws SET drawTime = ? WHERE id = ?",
            [new Date(newTime), drawId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Draw not found or no changes made." });
        }

        res.status(204).send();
    } catch (error) {
        console.error("Update draw time error:", error);
        res.status(500).json({ message: "Failed to update draw time." });
    }
};

exports.shiftAllDrawTimes = async (req, res) => {
    const { minutes } = req.body;
    const shiftInMinutes = parseInt(minutes, 10);

    if (isNaN(shiftInMinutes)) {
        return res.status(400).json({ message: "A valid number of minutes is required." });
    }

    try {
        const sql = "UPDATE draws SET drawTime = DATE_ADD(drawTime, INTERVAL ? MINUTE) WHERE status NOT IN ('FINISHED', 'SUSPENDED')";
        await db.execute(sql, [shiftInMinutes]);
        res.status(204).send();
    } catch (error) {
        console.error("Shift all draw times error:", error);
        res.status(500).json({ message: "Failed to shift draw times." });
    }
};


// --- Betting & Transactions ---

exports.placeBetsForClient = async (req, res) => {
    const { bets: betsToPlace, clientId } = req.body;
    const adminUserId = req.user.id;

    if (!clientId) return res.status(400).json({ message: "Client ID is required." });
    if (!Array.isArray(betsToPlace) || betsToPlace.length === 0) {
        return res.status(400).json({ message: "Bets data is invalid or empty." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [[overrideSetting]] = await connection.query("SELECT setting_value FROM settings WHERE setting_key = 'market_override'");
        const marketOverride = overrideSetting?.setting_value || 'AUTO';
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
        
        const [adminRows] = await connection.execute("SELECT id, wallet FROM admins WHERE id = ? FOR UPDATE", [adminUserId]);
        const admin = adminRows[0];
        if (!admin) throw new Error("System admin account not found.");

        const [clientRows] = await connection.execute("SELECT * FROM clients WHERE id = ? FOR UPDATE", [clientId]);
        const client = clientRows[0];
        if (!client) {
            await connection.rollback();
            return res.status(404).json({ message: "Client not found." });
        }
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
            description: `Admin Booking for Draw ${drawName}: ${betsToPlace.length} bet(s)`,
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
            message: `${newBets.length} bets placed successfully for client.`,
            updatedClient: normalizeClientData(updatedClientRows[0]),
            newBets: newBets,
            newTransactions: newTransactions
        });

    } catch (error) {
        await connection.rollback();
        console.error("Admin place bets error:", error);
        res.status(500).json({ message: "Transaction failed." });
    } finally {
        connection.release();
    }
};

exports.getAllBets = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT *, bettingCondition as `condition` FROM bets ORDER BY createdAt DESC");
        res.json(rows);
    } catch (error) {
        console.error("Error in getAllBets:", error);
        res.status(500).json({ message: "Failed to retrieve bets." });
    }
};

exports.getAllTransactions = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM transactions ORDER BY createdAt DESC");
        res.json(rows);
    } catch (error) {
        console.error("Error in getAllTransactions:", error);
        res.status(500).json({ message: "Failed to retrieve transactions." });
    }
};

exports.reverseWinningTransaction = async (req, res) => {
    const { id: transactionId } = req.params;
    const adminUserId = req.user.id;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [txRows] = await connection.execute("SELECT * FROM transactions WHERE id = ? FOR UPDATE", [transactionId]);
        const originalTx = txRows[0];

        if (!originalTx) {
            await connection.rollback();
            return res.status(404).json({ message: "Winning transaction not found." });
        }

        if (originalTx.type !== 'CREDIT' || !originalTx.description.startsWith('Win on')) {
            await connection.rollback();
            return res.status(400).json({ message: "This transaction is not a prize winning and cannot be reversed." });
        }
        if (originalTx.isReversed) {
            await connection.rollback();
            return res.status(400).json({ message: "This transaction has already been reversed." });
        }

        const clientId = originalTx.clientId;
        const reversalAmount = parseFloat(originalTx.amount);

        const [adminRows] = await connection.execute("SELECT id, wallet FROM admins WHERE id = ? FOR UPDATE", [adminUserId]);
        const admin = adminRows[0];

        const [clientRows] = await connection.execute("SELECT wallet FROM clients WHERE id = ? FOR UPDATE", [clientId]);
        const client = clientRows[0];

        const newClientBalance = parseFloat(client.wallet) - reversalAmount;
        const newAdminBalance = parseFloat(admin.wallet) + reversalAmount;

        await connection.execute("UPDATE clients SET wallet = ? WHERE id = ?", [newClientBalance, clientId]);
        await connection.execute("UPDATE admins SET wallet = ? WHERE id = ?", [newAdminBalance, admin.id]);
        await connection.execute("UPDATE transactions SET isReversed = TRUE WHERE id = ?", [transactionId]);

        const reversalDescription = `Reversal of prize winning from ${new Date(originalTx.createdAt).toLocaleDateString()}. Original Tx: ${transactionId.substring(0,8)}...`;
        const reversalTransaction = {
            id: `txn-rev-${generateUniqueId()}`,
            clientId, type: 'DEBIT', amount: reversalAmount,
            description: reversalDescription, balanceAfter: newClientBalance,
            createdAt: new Date(), relatedId: transactionId,
        };
        await connection.execute(
            "INSERT INTO transactions (id, clientId, type, amount, description, balanceAfter, createdAt, relatedId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            Object.values(reversalTransaction)
        );

        await connection.commit();
        res.status(200).json({ message: "Winning transaction reversed successfully." });

    } catch (error) {
        await connection.rollback();
        console.error("Reverse winning transaction error:", error);
        res.status(500).json({ message: "Failed to reverse transaction due to a server error." });
    } finally {
        connection.release();
    }
};


// --- Reporting ---

exports.getDrawStats = async (req, res) => {
    return generateDrawStats(req, res, db);
};

exports.getLiveDrawAnalysis = async (req, res) => {
    return generateLiveDrawAnalysis(req, res, db);
};

// --- Market Override ---

exports.getMarketOverride = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT setting_value FROM settings WHERE setting_key = 'market_override'");
        const override = rows[0]?.setting_value || 'AUTO';
        res.status(200).json({ override });
    } catch (error) {
        console.error("Get market override error:", error);
        res.status(500).json({ message: "Failed to get market override status." });
    }
};

exports.setMarketOverride = async (req, res) => {
    const { override } = req.body;
    if (['AUTO', 'OPEN', 'CLOSED'].includes(override)) {
        try {
            await db.execute(
                "UPDATE settings SET setting_value = ? WHERE setting_key = 'market_override'",
                [override]
            );
            // Also update in-memory state for immediate consistency for the current request cycle
            req.app.set('marketOverride', override);
            res.status(200).json({ message: `Market override set to ${override}.` });
        } catch (error) {
            console.error("Set market override error:", error);
            res.status(500).json({ message: "Failed to set market override status." });
        }
    } else {
        res.status(400).json({ message: 'Invalid override value.' });
    }
};