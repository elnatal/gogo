const express = require('express');
const router = express.Router();
const accountController = require('../controllers/AccountController');

router.get('/', accountController.index);
router.get('/:id', accountController.show);
router.post('/auth', accountController.auth);
router.post('/', accountController.store);

module.exports = router