const express = require('express');
const router = express.Router();
const VehicleController = require('../controllers/VehicleController');

router.get('/', VehicleController.index);

router.get('/activeVehicles', VehicleController.activeVehicles)

router.get('/search', VehicleController.search);

router.get('/:id', VehicleController.show);

router.post('/', VehicleController.store);

router.patch('/:id', VehicleController.update);

router.delete('/:id', VehicleController.remove);

module.exports = router;