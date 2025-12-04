import { GameType, PrizeRate, PositionalPrizeRates } from '../types/index.ts';

interface AllPrizeRates {
    [GameType.FourDigits]: PrizeRate;
    [GameType.ThreeDigits]: PrizeRate;
    [GameType.TwoDigits]: PrizeRate;
    [GameType.OneDigit]: PrizeRate;
    [GameType.Positional]: PositionalPrizeRates;
    [GameType.Combo]: PrizeRate;
}

// These rates are stored as percentages. For example, a rate of 800 means 800%,
// and the payout is calculated as Stake * (800 / 100) = Stake * 8.
export const defaultPrizeRates: AllPrizeRates = {
    // First (F) Prize: ₨100 → ₨525,000 (525,000%) | Second (S) Prize: ₨100 → ₨165,000 (165,000%)
    [GameType.FourDigits]: { first: 525000, second: 165000 },
    // First (F) Prize: ₨100 → ₨80,000 (80,000%) | Second (S) Prize: ₨100 → ₨26,000 (26,000%)
    [GameType.ThreeDigits]: { first: 80000, second: 26000 },
    // First (F) Prize: ₨100 → ₨8,000 (8,000%) | Second (S) Prize: ₨100 → ₨2,600 (2,600%)
    [GameType.TwoDigits]: { first: 8000, second: 2600 },
    // First (F) Prize: ₨100 → ₨800 (800%) | Second (S) Prize: ₨100 → ₨260 (260%)
    [GameType.OneDigit]: { first: 800, second: 260 },
    // Payouts for positional bets are now tiered based on the number of digits specified.
    // E.g., 'X1XX' (1 digit) uses the 1D rate, 'X1X2' (2 digits) uses the 2D rate, etc.
    [GameType.Positional]: {
        1: { first: 800, second: 260 },      // Same as 1D
        2: { first: 8000, second: 2600 },    // Same as 2D
        3: { first: 80000, second: 26000 },   // Same as 3D
        4: { first: 525000, second: 165000 }, // Same as 4D
    },
    // Combo bets derive their prize rates from the digit categories above.
    [GameType.Combo]: { first: 0, second: 0 },
};

export const defaultCommissionRates: Record<GameType, number> = {
    [GameType.FourDigits]: 20,
    [GameType.ThreeDigits]: 17,
    [GameType.TwoDigits]: 13,
    [GameType.OneDigit]: 10,
    [GameType.Positional]: 0,
    [GameType.Combo]: 0,
};