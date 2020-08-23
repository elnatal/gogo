const Ride = require('../models/Ride');
const { request, json } = require('express');
const { send } = require('../services/emailService');
const { getDriver } = require('../containers/driversContainer');
const { getUser } = require('../containers/usersContainer');
const { sendNotification } = require('../services/notificationService');

const index = (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var trip =  Ride.find({
            status: {
                $regex: req.query.status ? req.query.status : "", $options: "i"
            }
        });
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
            Ride.estimatedDocumentCount(),
            trip.exec()
        ]).then((value) => {
            if (value) {
                if (((page  * limit) <= value[0])) {
                    nextPage = page + 1;
                }
                res.send({data: value[1], count: value[0], nextPage, prevPage});
            }
        }).catch((error) => {
            console.log(error);
            res.status(500).send(error);
        });
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    };
};

const checkScheduledTrips = async (io) => {
    try {
        const trips = await Ride.find({status: "Scheduled"}).populate('passenger').populate('vehicle');
        console.log({trips});
        trips.forEach((trip) => {
            // const driverId = (trip.driver) ? trip.driver._id : "";
            // const passengerId = (trip.passenger) ? trip.passenger._id : "";

            // var driver = getDriver({ id: driverId});
            // if (driver) {
            //     io.of('/driver-socket').to(driver.socketId).emit('trip', trip);
            // } else 
            if (trip.vehicle && trip.vehicle != undefined && trip.vehicle.fcm && trip.vehicle.fcm != undefined) {
                sendNotification(trip.vehicle.fcm, {title: "Scheduled trip", body: "You have a scheduled trip."});
            } else {
                console.log("No driver fcm found");
            }

            // var passenger = getUser({ userId: passengerId });
            // if (passenger) {
            //     io.of('/passenger-socket').to(passenger.socketId).emit('trip', trip);
            // } else 
            if(trip.passenger && trip.passenger != undefined && trip.passenger.fcm && trip.passenger.fcm != undefined) {
                sendNotification(trip.passenger.fcm, {title: "Scheduled trip", body: "You have a scheduled trip."});
            } else {
                console.log("No passenger fcm found");
            }

        });
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}


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
        res.status(500).send(error);
    }
};

const show = async (req, res) => {
    try {
        var trip = await Ride.findById(req.params.id);
        console.log(req.params.id);
        res.send(trip);
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    };
};


const store = async (req, res) => {
    try {
        const savedTrip = await Ride.create(req.body);
        res.send(savedTrip);
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    }
};

const update = async (req, res) => {
    try {
        const updatedTrip = await Ride.updateOne({'_id': req.params.id}, req.body);
        res.send(updatedTrip);
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    }
};

const remove = async (req, res) => {
    try {
        const deletedTrip = await Ride.remove({_id: req.params.id});
        res.send(deletedTrip);
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    }
};

module.exports = { index, latest, show, store, update, remove, checkScheduledTrips };