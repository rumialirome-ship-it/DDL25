const path = require('path');
const { defaultPrizeRates, defaultCommissionRates } = require(path.resolve(__dirname, '..', 'data', 'defaultRates.js'));

const normalizeClientData = (client) => {
    if (!client) return null;
    
    // Create a copy to avoid modifying the original object
    const normalized = { ...client };

    // Remove password hash for security
    delete normalized.password;

    // Ensure wallet is a number
    normalized.wallet = Number(normalized.wallet) || 0;

    let parsedPrizeRates = {};
    if (typeof normalized.prizeRates === 'string') {
        try {
            if (normalized.prizeRates && normalized.prizeRates !== 'null') {
                parsedPrizeRates = JSON.parse(normalized.prizeRates);
            }
        } catch (e) {
            console.warn(`Could not parse prizeRates JSON for client ${client.id}:`, normalized.prizeRates);
        }
    } else {
        parsedPrizeRates = normalized.prizeRates || {};
    }

    // Deep merge prize rates to correctly handle the nested POSITIONAL structure
    normalized.prizeRates = {
        ...defaultPrizeRates,
        ...parsedPrizeRates,
        POSITIONAL: {
            ...defaultPrizeRates.POSITIONAL,
            ...(parsedPrizeRates.POSITIONAL || {}),
        }
    };
    
    let parsedCommissionRates = {};
     if (typeof normalized.commissionRates === 'string') {
        try {
            if (normalized.commissionRates && normalized.commissionRates !== 'null') {
                parsedCommissionRates = JSON.parse(normalized.commissionRates);
            }
        } catch (e) {
            console.warn(`Could not parse commissionRates JSON for client ${client.id}:`, normalized.commissionRates);
        }
    } else {
        parsedCommissionRates = normalized.commissionRates || {};
    }

    normalized.commissionRates = {
        ...defaultCommissionRates,
        ...parsedCommissionRates,
    };

    return normalized;
};

module.exports = { normalizeClientData };