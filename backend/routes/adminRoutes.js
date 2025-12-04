const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');

// FIX: Destructure all required controller functions directly. This aligns with
// the import pattern used across the rest of the application's routes,
// providing better error-checking at startup if a function is missing from
// the controller's exports and resolving potential startup crashes.
const {
    getAllClients,
    registerClient,
    getClientById,
    updateClientDetails,
    changeClientPassword,
    adjustClientWallet,
    updateAdminProfile,
    declareWinner,
    setDeclaredNumbers,
    updateDrawTime,
    shiftAllDrawTimes,
    placeBetsForClient,
    getAllBets,
    getAllTransactions,
    getDrawStats,
    getLiveDrawAnalysis,
    getMarketOverride,
    setMarketOverride,
    reverseWinningTransaction
} = require('../controllers/adminController');

// All routes in this file are protected and require admin privileges
router.use(protect, admin);

// Client management
router.get('/clients', getAllClients);
router.post('/clients', registerClient);
router.get('/clients/:id', getClientById);
router.put('/clients/:id', updateClientDetails);
router.put('/clients/:id/password', changeClientPassword);
router.post('/clients/:id/wallet', adjustClientWallet);

// Self-service for admin profile
router.put('/profile/credentials', updateAdminProfile);

// Draw management
router.post('/draws/:id/declare-winner', declareWinner);
router.put('/draws/:id/declared-numbers', setDeclaredNumbers);
router.put('/draws/:id/time', updateDrawTime);
router.post('/draws/shift-all', shiftAllDrawTimes);


// Betting
router.post('/bets', placeBetsForClient);
router.get('/bets', getAllBets);
router.get('/transactions', getAllTransactions);
router.post('/transactions/:id/reverse', reverseWinningTransaction);

// Reporting
router.get('/reports/draw/:id', getDrawStats);
router.get('/reports/live/:id', getLiveDrawAnalysis);

// Market Override
router.get('/market-override', getMarketOverride);
router.post('/market-override', setMarketOverride);

module.exports = router;