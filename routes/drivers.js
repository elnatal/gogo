const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');

router.get('/', async (req, res) => {
    try {
        var drives = await Driver.find();
        console.log(drives);
        res.send(drives);
    } catch(error) {
        res.send(error);
    };
});

router.get('/firebase/:firebaseId', async (req, res) => {
    try {
        var driver = await Driver.findOne({firebaseId: req.params.firebaseId});
        if (driver) {
            var vehicle = await Vehicle.findOne({driver: driver._id});
            if (vehicle) {
                res.send({driver, vehicle});
            } else {
                res.send({driver, vehicle: null});
            }
        } else {
            res.status(404).send("Unknown Driver");
        }
    } catch(error) {
        res.send(error);
    };
});

router.get('/:id', async (req, res) => {
    try {
        var driver = await Driver.findById(req.params.id);
        console.log(req.params.id);
        res.send(driver);
    } catch(error) {
        res.send(error);
    };
});

router.post('/', async (req, res) => {
    try {
        const savedDriver = await Driver.create(req.body);
        res.send(savedDriver);
    } catch(err) {
        console.log(err);
        res.send(err);
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const updatedDriver = await Driver.updateOne({'_id': req.params.id}, req.body);
        res.send(updatedDriver);
    } catch(err) {
        console.log(err);
        res.send({"message": "error => " + err});
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedDriver = await Driver.remove({_id: req.params.id});
        res.send(deletedDriver);
    } catch(err) {
        res.send(err);
    }
})

module.exports = router;