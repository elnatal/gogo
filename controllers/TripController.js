const Ride = require('../models/Ride');
const { request, json } = require('express');
const { send } = require('../services/emailService');
const { getDriver } = require('../containers/driversContainer');
const { getUser, getUsers } = require('../containers/usersContainer');
const { sendNotification } = require('../services/notificationService');
const { sendEmail, customerEmail } = require('../services/emailService')
const logger = require('../services/logger');
const SOS = require('../models/SOS');
const Setting = require('../models/Setting');
const { addTrip } = require('../containers/tripContainer');
const Ticket = require('../models/Ticket');
const { updateWallet } = require('./DriverController');
const Vehicle = require('../models/Vehicle');
const { getIO } = require('../sockets/io');
const { log } = require('../services/logger');

const index = (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;
        var filter = {};

        if (req.query.status != null && req.query.status != 'all') {
            filter['status'] = {
                $regex: req.query.status, $options: "i"
            };
        }

        if (req.query.driver != null && req.query.driver != 'all') {
            filter['driver'] = req.query.driver;
        }

        if (req.query.passenger != null && req.query.passenger != 'all') {
            filter['passenger'] = req.query.passenger;
        }

        if (req.query.dispatcher != null && req.query.dispatcher != 'all') {
            filter['dispatcher'] = req.query.dispatcher;
        }

        if (req.query.start != null && req.query.start != 'all' && req.query.end != null && req.query.end != 'all') {
            filter['$and'] = [{ "createdAt": { $gte: new Date(req.query.start) } }, { "createdAt": { $lte: new Date(req.query.end) } }];
        } else if (req.query.end != null && req.query.end != 'all') {
            filter['createdAt'] = { $lte: new Date(req.query.end) };
        } else if (req.query.start != null && req.query.start != 'all') {
            filter['createdAt'] = { $gte: new Date(req.query.start) };
        }

        var trip = Ride.find(filter);
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

        trip.sort({ createdAt: 'desc' });
        trip.limit(limit);
        trip.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                trip.populate(e);
            });
        }
        Promise.all([
            Ride.countDocuments(filter),
            trip.exec()
        ]).then((value) => {
            if (value) {
                if (((page * limit) <= value[0])) {
                    nextPage = page + 1;
                }
                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        }).catch((error) => {
            logger.error("Trip => " + error.toString());
            res.status(500).send(error);
        });
    } catch (error) {
        logger.error("Trip => " + error.toString());
        res.status(500).send(error);
    };
};

const checkScheduledTrips = async (io) => {
    try {
        var date = new Date()
        var date2 = date.setHours(date.getHours() + 1);
        const trips = await Ride.find({ status: "Scheduled", notified: false, schedule: { $gte: date, $lte: date2 } }).populate('passenger').populate('vehicle');
        trips.forEach((trip) => {
            // const driverId = (trip.driver) ? trip.driver._id : "";
            // const passengerId = (trip.passenger) ? trip.passenger._id : "";

            // var driver = getDriver({ id: driverId});
            // if (driver) {
            //     io.of('/driver-socket').to(driver.socketId).emit('trip', trip);
            // } else 
            if (trip.vehicle && trip.vehicle != undefined && trip.vehicle.fcm && trip.vehicle.fcm != undefined) {
                sendNotification(trip.vehicle.fcm, { title: "Scheduled trip", body: "You have a scheduled trip." });
                trip.notified = true;
                trip.save();
            } else {
                logger.error("Trip => No driver found");
            }

            // var passenger = getUser({ userId: passengerId });
            // if (passenger) {
            //     io.of('/passenger-socket').to(passenger.socketId).emit('trip', trip);
            // } else 
            if (trip.passenger && trip.passenger != undefined && trip.passenger.fcm && trip.passenger.fcm != undefined) {
                sendNotification(trip.passenger.fcm, { title: "Scheduled trip", body: "You have a scheduled trip." });
                trip.notified = true;
                trip.save();
            } else {
                logger.error("Trip => No passenger found");
            }

        });
    } catch (error) {
        logger.error("Trip => " + error.toString());
        res.status(500).send(error);
    }
}


const latest = (req, res) => {
    try {
        Ride.find({}, 'driver passenger pickUpAddress dropOffAddress status fare passengerName pickupTimestamp endTimestamp ', (error, rides) => {
            if (error) logger.error("Trip => " + error.toString());
            if (rides) {
                res.send(rides);
            }
        }).limit(30).populate({ path: 'driver', select: 'firstName lastName -_id' }).populate({ path: 'passenger', select: 'firstName lastName -_id' })
    } catch (error) {
        logger.error("Trip => " + error.toString());
        res.status(500).send(error);
    }
};

const show = async (req, res) => {
    try {
        var trip = await Ride.findById(req.params.id).populate('driver').populate('vehicle').populate('vehicleType').populate('dispatcher').populate('passenger').populate('ticket');
        res.send(trip);
    } catch (error) {
        logger.error("Trip => " + error.toString());
        res.status(500).send(error);
    };
};

const sos = async (req, res) => {
    try {
        var sos = await SOS.find({ ride: req.params.id });
        res.send(sos);
    } catch (error) {
        logger.error("Trip => " + error.toString());
        res.status(500).send(error);
    };
};


const store = async (req, res) => {
    try {
        const savedTrip = await Ride.create(req.body);
        res.send(savedTrip);
    } catch (error) {
        logger.error("Trip => " + error.toString());
        res.status(500).send(error);
    }
};

const update = async (req, res) => {
    try {
        const updatedTrip = await Ride.updateOne({ '_id': req.params.id }, req.body);
        res.send(updatedTrip);
    } catch (error) {
        logger.error("Trip => " + error.toString());
        res.status(500).send(error);
    }
};

const remove = async (req, res) => {
    try {
        const deletedTrip = await Ride.remove({ _id: req.params.id });
        res.send(deletedTrip);
    } catch (error) {
        logger.error("Trip => " + error.toString());
        res.status(500).send(error);
    }
};

const cancel = async (req, res) => {
    try {
        const io = getIO();
        Ride.findById(req.params.id, async (err, ride) => {
            if (err) console.log(err);
            if (ride) {
                ride.status = "Canceled";
                ride.endTimestamp = new Date();
                ride.cancelledBy = "Dispatcher";
                ride.cancelledReason = req.body.reason ? req.body.reason : "";
                ride.active = false;
                ride.save();
                addTrip(ride);
                Vehicle.updateOne({ _id: ride.vehicle._id }, { online: true }, (error, response) => { });
                var driver = getDriver({ id: ride.driver._id });
                if (driver) {
                    io.of('/driver-socket').to(driver.socketId).emit('trip', ride);
                    sendNotification(driver.fcm, { title: "Canceled", body: "Trip has been canceled" });
                    // io.of('/driver-socket').to(driver.socketId).emit('status', { "status": true });
                }

                var passengers = getUsers({ userId: ride.passenger._id });
                passengers.forEach((passenger) => {
                    if (passenger) {
                        io.of('/passenger-socket').to(passenger.socketId).emit('trip', ride);
                        sendNotification(passenger.fcm, { title: "Canceled", body: "Trip has been canceled" });
                    }
                })

                res.send(ride);
            }
        }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
    } catch (error) {
        logger.error("Trip => " + error.toString());
        res.status(500).send(error);
    }
}

const end = async (req, res) => {
    if (!req.body || !req.body.totalDistance) {
        res.send("totalDistance is required").status(500)
        return
    }
    try {
        const setting = await Setting.findOne();
        const io = getIO()
        Ride.findById(req.params.id, async (err, ride) => {
            if (err) console.log(err);
            if (ride) {
                if (ride.status != "Completed") {
                    var discount = setting.discount ? setting.discount : 0;
                    var tax = 0;
                    var companyCut = 0;
                    var date = new Date();
                    var payToDriver = 0;
                    var net = 0;
                    var tsts = new Date(ride.pickupTimestamp);
                    var durationInMinute = ((date.getTime() - tsts.getTime()) / 1000) / 60;
                    var cutFromDriver = 0;
                    var fare = 0;
                    if ((ride.type == "normal" || ride.type == "roadPickup") && setting.promoTripCount > 0) {
                        var tripCount = await Ride.countDocuments({ passenger: ride.passenger._id, status: "Completed" });
                        if (tripCount % setting.promoTripCount == 0) {
                            var t = tripCount / setting.promoTripCount;
                            discount += setting.promoAmount * (1 + ((setting.promoRate / 100) * t));
                        }
                    }
                    if (ride.type == "corporate") {
                        fare = (req.body.totalDistance * ride.vehicleType.pricePerKM) + ride.vehicleType.baseFare + (durationInMinute * ride.vehicleType.pricePerMin);
                        companyCut = (fare * (setting.defaultCommission / 100));
                        payToDriver = (fare - companyCut);
                        tax = companyCut * (setting.tax / 100);
                        net = companyCut - tax;
                        cutFromDriver = -companyCut;
                    } else if (ride.type == "roadPickup") {
                        fare = (req.body.totalDistance * ride.vehicleType.pricePerKM) + ride.vehicleType.baseFare + (durationInMinute * ride.vehicleType.pricePerMin);
                        companyCut = (fare * (setting.defaultRoadPickupCommission / 100)) - discount;
                        payToDriver = discount;
                        tax = (fare * (setting.defaultRoadPickupCommission / 100) - discount) * (setting.tax / 100);
                        net = ((fare * (setting.defaultRoadPickupCommission / 100)) - discount) - tax;
                        cutFromDriver = (-(fare * (setting.defaultRoadPickupCommission / 100))) + discount;
                    } else if (ride.type == "normal") {
                        fare = (req.body.totalDistance * ride.vehicleType.pricePerKM) + ride.vehicleType.baseFare + (durationInMinute * ride.vehicleType.pricePerMin);
                        companyCut = (fare * (setting.defaultCommission / 100)) - discount;
                        payToDriver = discount;
                        tax = (fare * (setting.defaultCommission / 100) - discount) * (setting.tax / 100);
                        net = ((fare * (setting.defaultCommission / 100)) - discount) - tax;
                        cutFromDriver = (-(fare * (setting.defaultCommission / 100))) + discount;
                    } else if (ride.type == "bid") {
                        fare = ride.bidAmount;
                        companyCut = (fare * (setting.defaultCommission / 100));
                        tax = (fare * (setting.defaultCommission / 100)) * (setting.tax / 100);
                        net = (fare * (setting.defaultCommission / 100)) - tax;
                        cutFromDriver = (-companyCut);
                        console.log("log=============");
                        console.log({ fare, companyCut, tax, net, cutFromDriver });
                    } else {
                        fare = (req.body.totalDistance * ride.vehicleType.pricePerKM) + ride.vehicleType.baseFare + (durationInMinute * ride.vehicleType.pricePerMin);
                        companyCut = (fare * (setting.defaultCommission / 100)) - discount;
                        payToDriver = discount;
                        tax = (fare * (setting.defaultCommission / 100) - discount) * (setting.tax / 100);
                        net = ((fare * (setting.defaultCommission / 100)) - discount) - tax;
                        cutFromDriver = (-(fare * (setting.defaultCommission / 100))) + discount;
                    }
                    ride.status = "Completed";
                    ride.totalDistance = req.body.totalDistance;
                    ride.discount = discount;
                    ride.companyCut = companyCut;
                    ride.tax = tax;
                    ride.fare = fare;
                    ride.payToDriver = payToDriver;
                    ride.net = net;
                    ride.endTimestamp = date;
                    ride.active = false;
                    ride.save();
                    addTrip(ride);
                    console.log({ ride });

                    if (ride.ticket) {
                        console.log("has ticket =========");
                        Ticket.updateOne({ _id: ride.ticket }, { amount: fare, timestamp: new Date(), ride: ride.id }, (err, ticketResponse) => {
                            if (err) console.log({ err });
                            if (ticketResponse) {
                                console.log("ticket updated");
                            }
                        });
                    }

                    updateWallet({ id: ride.driver._id, amount: cutFromDriver });

                    Vehicle.updateOne({ _id: ride.vehicle._id }, { online: true }, (err, vehicleResponse) => {
                        if (err) console.log({ err });
                        if (vehicleResponse) console.log("status updated", true, ride.vehicle._id);
                    });

                    if (ride.createdBy == "app" && ride.passenger && ride.passenger.email) {
                        sendEmail(ride.passenger.email, "Trip summery", "test email");
                    }
                    var driver = getDriver({ id: ride.driver._id });
                    if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', ride);

                    if (ride.passenger) {
                        var passengers = getUsers({ userId: ride.passenger._id });
                        passengers.forEach((passenger) => {
                            if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', ride);
                            sendNotification(passenger.fcm, { title: "Trip ended", body: "You have arrived at your destination" });
                        })
                    }

                    res.send(ride);
                }
            }
        }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
    } catch (error) {
        logger.error("Trip => " + error.toString());
        res.status(500).send(error);
    }
}

const resendEmail = async (req, res) => {
    try {
        const trip = await Ride.findById(req.params.id).populate('driver').populate('passenger').populate('vehicle').populate('vehicleType');

        if (trip && trip.passenger && trip.passenger.email) {
            var email = await customerEmail({ trip });
            if (email) {
                sendEmail(trip.passenger.email, "Trip summary", email);
                res.send("Email sent!");
            } else {
                res.send("Something went wrong!");
            }
        } else {
            res.send("Passenger does not have email.");
        }
    } catch (error) {
        logger.error("Trip => " + error.toString());
        res.status(500).send(error);
    }
}


module.exports = { index, latest, show, store, update, remove, checkScheduledTrips, sos, cancel, end, resendEmail };
