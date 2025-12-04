const express = require('express');
const router = express.Router();
const { getDraws } = require('../controllers/drawController');

// This is a public route, no protection needed
router.get('/', getDraws);

module.exports = router;
