const express = require('express');
const router = express.Router();
const CorporatePaymentController = require('../controllers/CorporatePaymentController');

router.get('/', CorporatePaymentController.index);

module.exports = router