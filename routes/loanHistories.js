const express = require('express');
const router = express.Router();
const LoanController = require('../controllers/LoanController');

router.get('/', LoanController.index);

module.exports = router