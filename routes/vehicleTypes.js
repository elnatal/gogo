const express = require('express');
const router = express.Router();
const VehicleType = require('../models/VehicleType');

router.get('/', async (req, res) => {
    try {
        var vehicleType = await VehicleType.find();
        console.log(vehicleType);
        res.json(vehicleType);
    } catch(err) {
        res.send('err ' + err);
    };
});

router.get('/:id', async (req, res) => {
    try {
        var vehicleType = await VehicleType.findById(req.params.id);
        console.log(req.params.id);
        res.send(vehicleType);
    } catch(err) {
        res.send('err ' + err);
    };
});

router.post('/', async (req, res) => {
    try {
        const savedVehicleType = await VehicleType.create(req.body);
        res.send(savedVehicleType);
    } catch(err) {
        console.log(err);
        res.send(err);
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const updatedVehicleType = await VehicleType.updateOne({'_id': req.params.id}, req.body);
        res.send(updatedVehicleType);
    } catch(err) {
        console.log(err);
        res.send({"message": "error => " + err});
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedVehicleType = await VehicleType.remove({_id: req.params.id});
        res.send(deletedVehicleType);
    } catch(err) {
        res.send(err);
    }
})

module.exports = router;