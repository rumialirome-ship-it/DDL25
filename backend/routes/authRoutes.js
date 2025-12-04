const express = require('express');
const router = express.Router();
// FIX: Changed to destructuring to ensure route handlers are correctly imported.
// This resolves a server startup error where `authController.getMe` was undefined.
const { loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.get('/me', protect, getMe);

module.exports = router;
