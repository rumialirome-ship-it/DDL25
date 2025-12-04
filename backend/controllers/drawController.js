const db = require('../database/db');
const { getDynamicDrawStatus, ensureDrawsForDay } = require('../utils/drawHelpers');

const getDraws = async (req, res) => {
    try {
        // This is the critical fix. Ensure draws for the current lottery day exist
        // before fetching them. The function uses INSERT IGNORE, so it's safe to run on every request.
        await ensureDrawsForDay(db);
        
        const now = new Date();
        
        // Define the "lottery day" boundary in UTC. 10:00 AM PKT (market open) is 05:00 AM UTC.
        let lotteryDayBoundary = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0, 0));

        let dayStart, dayEnd;

        // Determine the correct 24-hour window in UTC.
        if (now.getTime() < lotteryDayBoundary.getTime()) {
            // If it's before 05:00 UTC today, we are in the previous lottery day's cycle.
            dayStart = new Date(lotteryDayBoundary);
            dayStart.setUTCDate(dayStart.getUTCDate() - 1);
            dayEnd = lotteryDayBoundary;
        } else {
            // If it's 05:00 UTC or later, we are in the current lottery day's cycle.
            dayStart = lotteryDayBoundary;
            dayEnd = new Date(lotteryDayBoundary);
            dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
        }

        // Format dates to 'YYYY-MM-DD HH:MM:SS' UTC strings. This prevents the mysql2
        // driver from performing any timezone conversions when building the query,
        // making it robust regardless of the server's local timezone.
        const toUTCMySQLString = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

        // Fetch the persistent market override setting from the database
        const [[overrideSetting]] = await db.query("SELECT setting_value FROM settings WHERE setting_key = 'market_override'");
        const marketOverride = overrideSetting?.setting_value || 'AUTO';
        
        // Also update the app instance for consistency during this request cycle
        req.app.set('marketOverride', marketOverride);

        // Fetch only the draws that fall within the calculated "lottery day" window.
        const [rows] = await db.execute(
            "SELECT * FROM draws WHERE drawTime >= ? AND drawTime < ?", 
            [toUTCMySQLString(dayStart), toUTCMySQLString(dayEnd)]
        );
        
        const currentTime = new Date();
        
        const drawsWithStatus = rows.map(draw => {
            // The `mysql2` driver automatically parses JSON columns. We need to handle this correctly.
            let finalWinningNumbers = [];

            if (draw.winningNumbers) { // Check if it's not null/undefined
                if (typeof draw.winningNumbers === 'string') {
                    // Fallback for cases where it might be a string
                    try {
                        const parsed = JSON.parse(draw.winningNumbers);
                        if (Array.isArray(parsed)) {
                            finalWinningNumbers = parsed;
                        }
                    } catch (e) {
                        console.warn(`Could not parse winningNumbers string for draw ${draw.id}:`, draw.winningNumbers);
                    }
                } else if (Array.isArray(draw.winningNumbers)) {
                    // This is the expected path: it's already an array from mysql2.
                    finalWinningNumbers = draw.winningNumbers;
                }
            }

            const drawData = {
                ...draw,
                winningNumbers: finalWinningNumbers,
            };
            
            return {
                ...drawData,
                status: getDynamicDrawStatus(drawData, currentTime, marketOverride)
            };
        });
        
        res.json(drawsWithStatus);
    } catch (error) {
        // Log the actual error on the server for better debugging
        console.error("Error in getDraws controller:", error);
        res.status(500).json({ message: "Failed to retrieve draws." });
    }
};

module.exports = { getDraws };