const express = require('express');
const router = express.Router();
const WalletHistoryController = require('../controllers/WalletHistoryController');

router.get('/', WalletHistoryController.index);

module.exports = router