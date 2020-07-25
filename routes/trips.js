const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const { request } = require('express');

router.get('/', (req, res) => {
    try {
        var nextPage;

        var trip =  Ride.find();
        if (req.query.page && parseInt(req.query.page) != 0) {
            var skip = ( parseInt(req.query.page) - 1 ) * (req.query.limit ?  parseInt(req.query.limit) : 0)
            nextPage = parseInt(req.query.page) + 1;
            trip.skip(skip)
        }
        if (req.query.limit) {
            trip.limit(parseInt(req.query.limit))
        }
        Promise.all([
            Ride.count(),
            trip.exec()
        ]).then((value) => {
            if (value) {
                res.send({data: value[1], count: value[0], nextPage});
            }
        })
        // trip.populate('passenger');
        // trip.exec((err, trip) => {
        //     if (err) console.log(err);

        // });
    } catch(err) {
        res.send('err ' + err);
    };
});


router.get('/latest', (req, res) => {
    try {
        Ride.find({} , 'driver passenger pickupAddress dropOffAddress status fare passengerName pickupTimestamp endTimestamp ', (err, rides) => {
            if (err) console.log(err);
            if (rides) {
                res.send(rides);
            }
        }).limit(30).populate({path: 'driver', select: 'firstName lastName -_id'}).populate({path: 'passenger', select: 'firstName lastName -_id'})
    } catch (error) {
        console.log(error);
    }
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