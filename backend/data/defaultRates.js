// These rates are stored as percentages. For example, a rate of 800 means 800%,
// and the payout is calculated as Stake * (800 / 100) = Stake * 8.
const defaultPrizeRates = {
    // First (F) Prize: ₨100 → ₨525,000 (525,000%) | Second (S) Prize: ₨100 → ₨165,000 (165,000%)
    '4D': { first: 525000, second: 165000 },
    // First (F) Prize: ₨100 → ₨80,000 (80,000%) | Second (S) Prize: ₨100 → ₨26,000 (26,000%)
    '3D': { first: 80000, second: 26000 },
    // First (F) Prize: ₨100 → ₨8,000 (8,000%) | Second (S) Prize: ₨100 → ₨2,600 (2,600%)
    '2D': { first: 8000, second: 2600 },
    // First (F) Prize: ₨100 → ₨800 (800%) | Second (S) Prize: ₨100 → ₨260 (260%)
    '1D': { first: 800, second: 260 },
    // Payouts for positional bets are now tiered based on the number of digits specified.
    'POSITIONAL': {
        1: { first: 800, second: 260 },
        2: { first: 8000, second: 2600 },
        3: { first: 80000, second: 26000 },
        4: { first: 525000, second: 165000 },
    },
    'COMBO': { first: 0, second: 0 },
};

const defaultCommissionRates = {
    '4D': 20,
    '3D': 17,
    '2D': 13,
    '1D': 10,
    'POSITIONAL': 0,
    'COMBO': 0,
};

module.exports = {
    defaultPrizeRates,
    defaultCommissionRates
};