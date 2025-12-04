const GameType = {
    OneDigit: '1D', TwoDigits: '2D', ThreeDigits: '3D', FourDigits: '4D',
    Combo: 'COMBO', Positional: 'POSITIONAL'
};
const BettingCondition = { First: 'FIRST', Second: 'SECOND' };

const checkMatch = (betNumber, betGameType, winningNumber) => {
    if (winningNumber.length !== 4) return false;
    switch (betGameType) {
        case GameType.FourDigits: return betNumber.length === 4 && betNumber === winningNumber;
        case GameType.ThreeDigits: return betNumber.length === 3 && winningNumber.startsWith(betNumber);
        case GameType.TwoDigits: return betNumber.length === 2 && winningNumber.startsWith(betNumber);
        case GameType.OneDigit: return betNumber.length === 1 && winningNumber.startsWith(betNumber);
        default: return false;
    }
};

const isBetWinner = (bet, winningNumbers) => {
    if (!winningNumbers || winningNumbers.length === 0 || !bet.number) {
        return false;
    }

    const firstPrizeNumber = winningNumbers[0];
    const secondPrizeNumbers = winningNumbers.slice(1);

    if (bet.gameType === GameType.Positional) {
        // Positions are stored as a JSON string in DB.
        let parsedPositions = null;
        if(bet.positions && typeof bet.positions === 'string') {
            try {
                parsedPositions = JSON.parse(bet.positions);
            } catch(e) { /* ignore */ }
        } else {
            parsedPositions = bet.positions;
        }

        // Handle legacy positional bets (sequence match with `positions` array)
        if (Array.isArray(parsedPositions) && parsedPositions.length > 0) {
            // This legacy type ONLY applies to the First prize number.
            if (bet.condition === BettingCondition.Second) {
                return false;
            }
            if (firstPrizeNumber.length !== 4) return false;
            const sortedPositions = [...parsedPositions].sort((a, b) => a - b);
            if (sortedPositions.length !== bet.number.length) return false;

            let targetSubstring = '';
            for (const pos of sortedPositions) {
                if (pos < 1 || pos > 4) return false;
                targetSubstring += firstPrizeNumber[pos - 1];
            }
            return bet.number === targetSubstring;
        }

        // Handle new positional bets (pattern match, e.g., "5X1X")
        const checkPatternMatch = (pattern, target) => {
            if (pattern.length === 4 && target.length === 4) {
                for (let i = 0; i < 4; i++) {
                    const patternChar = pattern[i].toUpperCase();
                    if (patternChar !== 'X' && patternChar !== target[i]) {
                        return false; // Mismatch
                    }
                }
                return true; // All non-X characters matched
            }
            return false;
        };
        
        if (bet.condition === BettingCondition.First) {
            return checkPatternMatch(bet.number, firstPrizeNumber);
        }
        if (bet.condition === BettingCondition.Second) {
            return secondPrizeNumbers.some(wn => checkPatternMatch(bet.number, wn));
        }
        
        return false;
    }

    switch (bet.condition) {
        case BettingCondition.First:
            return checkMatch(bet.number, bet.gameType, firstPrizeNumber);
        case BettingCondition.Second:
            return secondPrizeNumbers.some(wn => checkMatch(bet.number, bet.gameType, wn));
        default:
            return false;
    }
};

module.exports = { isBetWinner };