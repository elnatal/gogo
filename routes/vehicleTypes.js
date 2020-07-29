const express = require('express');
const router = express.Router();
const VehicleTypeController = require('../controllers/VehicleTypeController');

router.get('/', VehicleTypeController.index);

router.get('/:id', VehicleTypeController.show);

router.post('/', VehicleTypeController.store);

router.patch('/:id', VehicleTypeController.update);

router.delete('/:id', VehicleTypeController.remove)

module.exports = router;