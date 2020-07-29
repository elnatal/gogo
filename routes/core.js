const express = require('express');
const router = express.Router();
const CoreController = require('../controllers/CoreController');

router.get('/getSettingsAndVehicleModels', CoreController.getSettingsAndVehicleModels);

router.get('/dashboard', CoreController.dashboard);

router.post('/route', CoreController.route);

module.exports = router;