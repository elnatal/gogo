const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');

router.get('/', async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var drives =  Driver.find();
        if (req.query.page && parseInt(req.query.page) != 0) {
            page = parseInt(req.query.page);
        }
        if (req.query.limit) {
            limit = parseInt(req.query.limit);
        }

        if (page > 1) {
            prevPage = page - 1;
        }

        skip = (page - 1) * limit;
        
        drives.sort({createdAt: 'desc'});
        drives.limit(limit);
        drives.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                drives.populate(e);
            });
        }
        Promise.all([
            Driver.countDocuments(),
            drives.exec()
        ]).then((value) => {
            if (value) {
                if (((page  * limit) <= value[0])) {
                    nextPage = page + 1;
                }
                res.send({data: value[1], count: value[0], nextPage, prevPage});
            }
        });
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
        res.status(500).send(error);
    };
});

router.get('/:id', (req, res) => {
    try {
        Driver.findById(req.params.id, (err, driver) => {
            if (err) console.log(err);
            if (driver) {
                console.log({"drivers": driver});
                Vehicle.findOne({driver: driver._id}, (err, vehicle) => {
                    if (err) console.log(err);
                    if (vehicle) {
                        res.send({driver, vehicle});
                    } else {
                        res.send({driver, vehicle: null});
                    }
                }).populate('drives');
            } else {
                res.status(404).send("Unknown Driver");
            }
        });
    } catch(error) {
        res.status(500).send(error);
    };
});

router.get('/:id/bookings', (req, res) => {
    try {
        Ride.find({driver: req.params.id}, (err, rides) => {
            res.send(rides);
        }).sort({createdAt: 'desc'}).limit(15).populate('passenger');
    } catch (error) {
        res.status(500).send(error);
    }
});

router.post('/', async (req, res) => {
    try {
        const savedDriver = await Driver.create(req.body);
        res.send(savedDriver);
    } catch(err) {
        console.log(err);
        res.status(500).send(err);
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const updatedDriver = await Driver.updateOne({'_id': req.params.id}, req.body);
        res.send(updatedDriver);
    } catch(err) {
        console.log(err);
        res.status(500).send({"message": "error => " + err});
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedDriver = await Driver.remove({_id: req.params.id});
        res.send(deletedDriver);
    } catch(err) {
        res.status(500).send(err);
    }
})

module.exports = router;