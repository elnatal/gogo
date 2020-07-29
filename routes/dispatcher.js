const express = require('express');
const router = express.Router();
const dispatcherController = require('../controllers/DispatcherController');
const { model } = require('../models/User');

router.get('/', dispatcherController.index);
router.get('/:id', dispatcherController.show);
router.post('/auth', dispatcherController.auth);
router.post('/', dispatcherController.store);

module.exports = router