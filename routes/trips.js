const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');

router.get('/', async (req, res) => {
    try {
        var trip = await Ride.find();
        console.log(trip);
        res.send(trip);
    } catch(err) {
        res.send('err ' + err);
    };
});

router.get('/:id', async (req, res) => {
    try {
        var trip = await Ride.findById(req.params.id);
        console.log(req.params.id);
        res.send(trip);
    } catch(err) {
        res.send('err ' + err);
    };
});

router.post('/', async (req, res) => {
    try {
        const savedTrip = await Ride.create(req.body);
        res.send(savedTrip);
    } catch(err) {
        console.log(err);
        res.send(err);
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const updatedTrip = await Ride.updateOne({'_id': req.params.id}, req.body);
        res.send(updatedTrip);
    } catch(err) {
        console.log(err);
        res.send({"message": "error => " + err});
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedTrip = await Ride.remove({_id: req.params.id});
        res.send(deletedTrip);
    } catch(err) {
        res.send(err);
    }
})

module.exports = router;