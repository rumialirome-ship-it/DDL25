import { Bet, GameType, BettingCondition, Draw, DrawStatus, Client, MarketOverride, Role } from '../types/index.ts';
import { defaultPrizeRates, defaultCommissionRates } from '../data/mockData.ts';

export const normalizeClientData = (client: Partial<Client>): Client => {
    if (!client) return {} as Client;

    const normalized: Partial<Client> = { ...client };

    // Ensure wallet is always a number to prevent crashes.
    // This correctly handles both numbers and string representations from the API.
    normalized.wallet = Number(client.wallet) || 0;

    // Perform a deep merge for prize rates to correctly handle the nested structure
    // of Positional prize rates, preventing client-specific overrides from being lost.
    const clientPrizeRates = (client.prizeRates || {}) as Partial<typeof defaultPrizeRates>;
    normalized.prizeRates = {
        ...defaultPrizeRates,
        ...clientPrizeRates,
        [GameType.Positional]: {
            ...defaultPrizeRates[GameType.Positional],
            ...(clientPrizeRates[GameType.Positional] || {}),
        }
    };

    normalized.commissionRates = {
        ...defaultCommissionRates,
        ...(client.commissionRates || {}),
    };
    
    // Admins don't have a `clientId` field from the backend. We'll add a default
    // to conform to the Client type used throughout the frontend, preventing errors.
    if (client.role === Role.Admin && !client.clientId) {
        normalized.clientId = client.username || 'admin';
    }
    
    // Initialize other potentially missing fields for admins to fully conform to the Client type.
    if (client.role === Role.Admin) {
        normalized.area = client.area || 'N/A';
        normalized.contact = client.contact || 'N/A';
        normalized.isActive = client.isActive !== undefined ? client.isActive : true;
    }


    // Cast to Client, assuming other required properties are present from the API.
    return normalized as Client;
};


const checkMatch = (betNumber: string, betGameType: GameType, winningNumber: string): boolean => {
    if (winningNumber.length !== 4) return false;
    switch (betGameType) {
        case GameType.FourDigits: return betNumber.length === 4 && betNumber === winningNumber;
        case GameType.ThreeDigits: return betNumber.length === 3 && winningNumber.startsWith(betNumber);
        case GameType.TwoDigits: return betNumber.length === 2 && winningNumber.startsWith(betNumber);
        case GameType.OneDigit: return betNumber.length === 1 && winningNumber.startsWith(betNumber);
        default: return false;
    }
};

export const isBetWinner = (bet: Bet, winningNumbers: string[]): boolean => {
    if (!winningNumbers || winningNumbers.length === 0 || !bet.number) {
        return false;
    }

    const firstPrizeNumber = winningNumbers[0];
    const secondPrizeNumbers = winningNumbers.slice(1);

    if (bet.gameType === GameType.Positional) {
        // Handle legacy positional bets (sequence match with `positions` array)
        if (bet.positions && bet.positions.length > 0) {
            // This legacy type ONLY applies to the First prize number.
            if (bet.condition === BettingCondition.Second) {
                return false;
            }
            if (firstPrizeNumber.length !== 4) return false;
            const sortedPositions = [...bet.positions].sort((a, b) => a - b);
            if (sortedPositions.length !== bet.number.length) return false;

            let targetSubstring = '';
            for (const pos of sortedPositions) {
                if (pos < 1 || pos > 4) return false;
                targetSubstring += firstPrizeNumber[pos - 1];
            }
            return bet.number === targetSubstring;
        }

        // Handle new positional bets (pattern match, e.g., "5X1X")
        const checkPatternMatch = (pattern: string, target: string): boolean => {
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


export const getPermutations = (digits: number[], size: number): string[] => {
    const result: string[] = [];
    if (size > digits.length) {
        return [];
    }
    const backtrack = (permutation: string[], used: boolean[]) => {
        if (permutation.length === size) {
            result.push(permutation.join(''));
            return;
        }
        for (let i = 0; i < digits.length; i++) {
            if (used[i]) continue;
            used[i] = true; // Mark as used
            permutation.push(String(digits[i]));
            backtrack(permutation, used);
            permutation.pop();
            used[i] = false; // Unmark for backtracking
        }
    };
    backtrack([], Array(digits.length).fill(false));
    return result;
};

export const generateAllSubstrings = (str: string): string[] => {
    const substrings = new Set<string>();
    for (let i = 0; i < str.length; i++) {
        for (let j = i + 1; j < str.length + 1; j++) {
            substrings.add(str.slice(i, j));
        }
    }
    return Array.from(substrings);
}

export const getGameTypeDisplayName = (gameType: GameType): string => {
    switch (gameType) {
        case GameType.OneDigit: return '1 Digit';
        case GameType.TwoDigits: return '2 Digits';
        case GameType.ThreeDigits: return '3 Digits';
        case GameType.FourDigits: return '4 Digits';
        case GameType.Combo: return 'Combo';
        case GameType.Positional: return 'Multi Positional 1 digit';
        default: return gameType;
    }
};