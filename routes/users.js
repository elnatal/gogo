const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Ride = require('../models/Ride');

router.get('/', async (req, res) => {
    try {
        var user = await User.find();
        res.send(user);
    } catch(err) {
        res.send('err ' + err);
    };
});

router.get('/firebase/:firebaseId', async (req, res) => {
    try {
        var user = await User.findOne({firebaseId: req.params.firebaseId});
        if (user) {
            res.send(user);
        } else {
            res.status(404).send("User doesn't exist");
        }
    } catch(error) {
        res.send(error);
    };
});

router.get('/:id', async (req, res) => {
    try {
        var user = await User.findById(req.params.id);
        res.send(user);
    } catch(err) {
        res.send('err ' + err);
    };
});

router.get('/:id/bookings', (req, res) => {
    try {
        Ride.find({passenger: req.params.id}, (err, rides) => {
            res.send(rides).populate('driver').populate('vehicleType').populate('vehicle');
        });
    } catch (error) {
        console.log(error);
    }
});

router.post('/', async (req, res) => {
    try {
        const savedUser = await User.create(req.body);
        res.send(savedUser);
    } catch(err) {
        console.log(err);
        res.send(err);
    }
});

router.patch('/:id', async (req, res) => {
    try {
        await User.updateOne({'_id': req.params.id}, req.body);
        const user = await User.findById(req.params.id);
        res.send(user);
    } catch(err) {
        console.log(err);
        res.send({"message": "error => " + err});
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedUser = await User.remove({_id: req.params.id});
        res.send(deletedUser);
    } catch(err) {
        res.send(err);
    }
})

module.exports = router;