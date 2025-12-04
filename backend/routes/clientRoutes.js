const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    getClientBets,
    getClientTransactions,
    placeBets,
    updateClientCredentials
} = require('../controllers/clientController');

// All routes in this file are protected
router.use(protect);

router.get('/bets', getClientBets);
router.get('/transactions', getClientTransactions);
router.post('/bets', placeBets);
router.put('/credentials', updateClientCredentials);

module.exports = router;