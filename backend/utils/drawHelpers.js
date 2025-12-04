const DrawStatus = {
    Upcoming: 'UPCOMING',
    Open: 'OPEN',
    Closed: 'CLOSED',
    Finished: 'FINISHED',
    Suspended: 'SUSPENDED'
};

const getDynamicDrawStatus = (draw, currentTime, marketOverride) => {
    // 1. Final states set by admin are not overridden by time-based logic.
    if (draw.status === DrawStatus.Finished || draw.status === DrawStatus.Suspended) {
        return draw.status;
    }
    
    // 2. New check: If numbers are declared but draw isn't finished, its status is 'DECLARED'.
    if (Array.isArray(draw.winningNumbers) && draw.winningNumbers.length > 0) {
        return 'DECLARED';
    }

    // 3. Admin manual market override takes next highest precedence.
    if (marketOverride === 'OPEN') return DrawStatus.Open;
    if (marketOverride === 'CLOSED') return DrawStatus.Closed;

    // --- Automatic Time-Based Logic (all times are handled as UTC) ---
    const drawTime = new Date(draw.drawTime);
    const bookingCloseTime = new Date(drawTime.getTime() - 10 * 60 * 1000);

    // 4. If the booking window for this specific draw has closed, it's CLOSED.
    // This takes precedence over other time checks.
    if (currentTime.getTime() >= bookingCloseTime.getTime()) {
        return DrawStatus.Closed;
    }

    // 5. Define the global market opening time for the day in UTC.
    // Market opens 10:00 AM PKT -> 05:00 UTC.
    const marketOpenTime = new Date(Date.UTC(currentTime.getUTCFullYear(), currentTime.getUTCMonth(), currentTime.getUTCDate(), 5, 0, 0, 0));

    // 6. If the current time is before the entire market opens for the day, the draw is UPCOMING.
    if (currentTime.getTime() < marketOpenTime.getTime()) {
        return DrawStatus.Upcoming;
    }
    
    // 7. If the booking window is still open and the market has started for the day, the draw is OPEN.
    return DrawStatus.Open;
};

const ensureDrawsForDay = async (connection) => {
    const now = new Date();
    // A "lottery day" starts when the market opens: 10 AM PKT (UTC+5), which is 05:00 UTC.
    let lotteryDayBoundary = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0, 0));

    let dayStart;
    // Determine the start of the lottery day window we need to ensure draws for.
    if (now.getTime() < lotteryDayBoundary.getTime()) {
        // We are in the previous lottery day's cycle.
        dayStart = new Date(lotteryDayBoundary);
        dayStart.setUTCDate(dayStart.getUTCDate() - 1);
    } else {
        // We are in the current lottery day's cycle.
        dayStart = lotteryDayBoundary;
    }
    
    const drawTimesPKT = [
        '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
        '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
    ];
    
    // Using INSERT IGNORE is crucial. It silently skips inserting rows that would 
    // violate a unique key constraint (like our unique `drawTime`), making this
    // function safe to run multiple times without creating duplicate draws.
    const insertSql = "INSERT IGNORE INTO draws (id, name, level, drawTime, status, winningNumbers) VALUES ?";
    const drawValues = [];
    
    const lotteryYear = dayStart.getUTCFullYear();
    const lotteryMonth = dayStart.getUTCMonth();
    const lotteryDay = dayStart.getUTCDate();
    
    const datePrefix = `${lotteryYear}-${String(lotteryMonth + 1).padStart(2, '0')}-${String(lotteryDay).padStart(2, '0')}`;

    for (const [index, time] of drawTimesPKT.entries()) {
        const [hours, minutes] = time.split(':').map(Number);
        
        // Convert PKT hours to UTC hours for storage
        const utcHours = hours - 5; 
        
        const drawTime = new Date(Date.UTC(lotteryYear, lotteryMonth, lotteryDay, utcHours, minutes, 0, 0));

        drawValues.push([
            `draw-${datePrefix}-${index + 1}`,
            `${index + 1}`,
            'F',
            drawTime,
            'UPCOMING',
            null
        ]);
    }
    
    if (drawValues.length > 0) {
        await connection.query(insertSql, [drawValues]);
    }
};

module.exports = { getDynamicDrawStatus, ensureDrawsForDay };