const express = require('express');
const router = express.Router();
const SOSController = require('../controllers/SOSController');

router.get('/', SOSController.index);

router.get('/:id', SOSController.show);

router.post('/', SOSController.store);

module.exports = router