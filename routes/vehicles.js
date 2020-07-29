const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/VehicleController');

router.get('/', vehicleController.index);

router.get('/activeVehicles', vehicleController.activeVehicles)

router.get('/:id', vehicleController.show);

router.post('/', vehicleController.store);

router.patch('/:id', vehicleController.update);

router.delete('/:id', vehicleController.remove);

module.exports = router;