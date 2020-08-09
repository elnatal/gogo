const Ride = require('../models/Ride');
const { request, json } = require('express');
const { send } = require('../services/emailService');

const index = (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var trip =  Ride.find();
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
        
        trip.sort({createdAt: 'desc'});
        trip.limit(limit);
        trip.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                trip.populate(e);
            });
        }
        Promise.all([
            Ride.countDocuments(),
            trip.exec()
        ]).then((value) => {
            if (value) {
                if (((page  * limit) <= value[0])) {
                    nextPage = page + 1;
                }
                res.send({data: value[1], count: value[0], nextPage, prevPage});
            }
        });
    } catch(err) {
        res.send('err ' + err);
    };
};


const latest = (req, res) => {
    try {
        Ride.find({} , 'driver passenger pickUpAddress dropOffAddress status fare passengerName pickupTimestamp endTimestamp ', (err, rides) => {
            if (err) console.log(err);
            if (rides) {
                res.send(rides);
            }
        }).limit(30).populate({path: 'driver', select: 'firstName lastName -_id'}).populate({path: 'passenger', select: 'firstName lastName -_id'})
    } catch (error) {
        console.log(error);
    }
};

const show = async (req, res) => {
    try {
        var trip = await Ride.findById(req.params.id);
        console.log(req.params.id);
        res.send(trip);
    } catch(err) {
        res.send('err ' + err);
    };
};


const store = async (req, res) => {
    try {
        const savedTrip = await Ride.create(req.body);
        res.send(savedTrip);
    } catch(err) {
        console.log(err);
        res.send(err);
    }
};

const update = async (req, res) => {
    try {
        const updatedTrip = await Ride.updateOne({'_id': req.params.id}, req.body);
        res.send(updatedTrip);
    } catch(err) {
        console.log(err);
        res.send({"message": "error => " + err});
    }
};

const remove = async (req, res) => {
    try {
        const deletedTrip = await Ride.remove({_id: req.params.id});
        res.send(deletedTrip);
    } catch(err) {
        res.send(err);
    }
};

module.exports = { index, latest, show, store, update, remove };