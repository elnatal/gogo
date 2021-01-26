const express = require('express');
const router = express.Router();
const VehicleController = require('../controllers/VehicleController');
const { getNearbyDrivers } = require('../sockets/core');

router.get('/', VehicleController.index);

router.get('/activeVehicles', VehicleController.activeVehicles)

router.get('/search', VehicleController.search);

router.get('/drivers', async (req, res) => {
    try {
        var drivers = await getNearbyDrivers({location: {lat: 8.9996048, long: 38.78399910000002}, distance: 1000000});
        res.send(drivers);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
})

router.get('/:id', VehicleController.show);

router.post('/', VehicleController.store);

router.patch('/:id', VehicleController.update);

router.delete('/:id', VehicleController.remove);

module.exports = router;