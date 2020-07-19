const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');

router.get('/', async (req, res) => {
    try {
        var vehicle = await Vehicle.find();
        console.log(vehicle);
        res.send(vehicle);
    } catch (err) {
        res.send('err ' + err);
    };
});

router.get('/activeVehicles', async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ "online": true }).populate('driver');
        res.send(vehicles);
    } catch (err) {
        res.send(err);
        console.log(err);
    }
})

router.get('/:id', async (req, res) => {
    try {
        var vehicle = await Vehicle.findById(req.params.id);
        console.log(req.params.id);
        res.send(vehicle);
    } catch (err) {
        res.send('err ' + err);
    };
});

router.post('/', async (req, res) => {
    try {
        const savedVehicle = await Vehicle.create(req.body);
        res.send(savedVehicle);
    } catch (err) {
        console.log(err);
        res.send(err);
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const updatedVehicle = await Vehicle.updateOne({ '_id': req.params.id }, req.body);
        res.send(updatedVehicle);
    } catch (err) {
        console.log(err);
        res.send({ "message": "error => " + err });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedVehicle = await Vehicle.remove({ _id: req.params.id });
        res.send(deletedVehicle);
    } catch (err) {
        res.send(err);
    }
});

module.exports = router;