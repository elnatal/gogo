const Vehicle = require("../models/Vehicle");
const DriverObject = require('../models/DriverObject');
const { addDriver, removeDriver, getDriver, getDrivers } = require('../containers/driversContainer');
const { getRequest, updateRequest, getDriverRequest } = require('../containers/requestContainer');
const Ride = require('../models/Ride');
const { getUser, getUsers } = require("../containers/usersContainer");
const { updateRent } = require("../containers/rentContainer");
const Setting = require("../models/Setting");
const Ticket = require("../models/Ticket");
const { sendEmail } = require("../services/emailService");
const Token = require("../models/Token");
const { request } = require("express");
const Rent = require("../models/Rent");
const { updateWallet } = require("../controllers/DriverController");
const { getIO } = require("./io");

module.exports = (socket) => {
    console.log("new connection", socket.id);
    var io = getIO();
    var id = "";
    var vehicleId = "";
    var fcm = "";
    var location = null;
    var started = false;
    var token = "";
    var setting = Setting.findOne();
    var inTrip = false;

    socket.on('init', async (driverInfo) => {
        console.log(driverInfo);
        console.log("///////////////////////////////////");
        console.log("//////////// Le Nati //////////////");
        console.log("///////////////////////////////////");
        // console.log(JSON.parse(driverInfo));
        console.log("type", typeof (driverInfo));
        if (!started && driverInfo && driverInfo.id != undefined && driverInfo.id != null && driverInfo.id != "" && driverInfo.vehicleId != null && driverInfo.vehicleId != undefined && driverInfo.vehicleId != "" && driverInfo.fcm != undefined && driverInfo.fcm != null && driverInfo.fcm != "" && driverInfo.location != null && driverInfo.location != undefined && driverInfo.location.lat != null && driverInfo.location.lat != undefined && driverInfo.location.long != undefined && driverInfo.location.long != null && driverInfo.token != "" && driverInfo.token != null && driverInfo.token != undefined) {
            console.log("passed");
            id = driverInfo.id;
            vehicleId = driverInfo.vehicleId;
            location = driverInfo.location;
            fcm = driverInfo.fcm;
            token = driverInfo.token;
            started = true;

            try {
                var request = getDriverRequest({ driverId: id });
                var trip = Ride.findOne({ active: true, driver: id }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                var rent = Rent.findOne({ active: true, driver: id }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                Promise.all([rent, trip]).then((values) => {
                    console.log("status", values[0] || values[1] || request ? false : true);
                    Vehicle.updateOne({ _id: vehicleId }, {
                        fcm,
                        online: values[0] || values[1] || request ? false : true,
                        timestamp: new Date(),
                        position: {
                            type: "Point",
                            coordinates: [
                                location.long,
                                location.lat
                            ]
                        }
                    }, (err, res) => {
                        if (err) console.log({ err });
                        if (res) {
                            console.log("vehicle updated, status ", res || request ? false : true);
                        }
                    });

                    if (values[0]) {
                        socket.emit('rent', values[0]);
                        console.log("rent", values[0]);
                    } else if (values[1]) {
                        socket.emit('trip', values[1]);
                        console.log("trip", values[1]);
                        // socket.emit('status', { "status": false });
                    } else if (request) {
                        socket.emit('request', request);
                        console.log({ request });
                    } else {
                        socket.emit('status', { "status": true });
                        console.log("status", true);
                    }
                })
            } catch (error) {
                console.log(error);
            }

            const existingDrivers = getDrivers({ id });

            existingDrivers.forEach((driver) => {
                if (driver && driver.token != token) {
                    console.log("unauthorized", driver.token);
                    io.of('/driver-socket').to(driver.socketId).emit('unauthorized');
                    removeDriver({ id: driver.id });
                    Token.updateOne({ _id: driver.token }, { active: false }, (err, res) => {
                        if (err) console.log({ err });
                        if (res) console.log("token removed", driver.token);
                    });
                }
            })

            addDriver({ newDriver: new DriverObject({ id, vehicleId, fcm, token, socketId: socket.id, removeDriverCallback }) })
            // addDriver({ driverId: id, vehicleId, fcm, socketId: socket.id });

            // console.log("driver", getDriver({ id }));

            async function removeDriverCallback() {
                // console.log("unauthorized", { token });
                // socket.emit("unauthorized");
                // await Token.updateOne({ _id: token }, { active: false });
                // socket.disconnect();
            }
        } else {
            return { error: "Invalid data" };
        }
    })

    socket.on('updateLocation', (newLocation) => {
        console.log({ newLocation });
        if (started && newLocation && newLocation.lat && newLocation.long) {
            Vehicle.updateOne({ _id: vehicleId }, {
                timestamp: new Date(),
                position: {
                    type: "Point",
                    coordinates: [
                        newLocation.long,
                        newLocation.lat
                    ]
                }
            }, (err, res) => {
                if (err) console.log({ err });
                if (res) console.log("location updated", vehicleId);
            });
        }
    });

    socket.on('changeStatus', (online) => {
        console.log(typeof (online));
        console.log('vehicle id', vehicleId);
        if (started) {
            if (online != null && vehicleId) {
                console.log('status', online);
                Vehicle.updateOne({ _id: vehicleId }, { online }, (err, res) => {
                    if (err) console.log({ err });
                    if (res) {
                        socket.emit('status', { "status": online });
                        console.log("updated status", online);
                    }
                });
            } else {
                console.log("incorrect data");
            }
        } else {
            console.log("not started");
        }
    });

    socket.on('updateRequest', (request) => {
        console.log("request update", request);
        updateRequest({ passengerId: request.passengerId, driverId: request.driverId, status: request.status });
    });

    socket.on('updateRent', (rentObject) => {
        console.log("request update", rentObject);
        updateRent({ passengerId: rentObject.passengerId, driverId: rentObject.driverId, status: rentObject.status });
    });

    socket.on('arrived', (trip) => {
        console.log("arrived", trip)
        if (started && trip && trip.id) {
            try {
                Ride.findById(trip.id, (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        res.status = "Arrived";
                        res.active = true;
                        res.save();
                        var driver = getDriver({ id: res.driver._id });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                        if (res.passenger) {
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                            })
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('startTrip', (trip) => {
        console.log("start trip", trip)
        if (started && trip && trip.id) {
            try {
                Ride.findById(trip.id, (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        res.status = "Started";
                        res.active = true;
                        res.pickupTimestamp = new Date();
                        res.save();
                        var driver = getDriver({ id: res.driver._id });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                        if (res.passenger) {
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                            })
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('startRent', (rent) => {
        console.log("start rent", rent)
        if (started && rent && rent.id) {
            try {
                Rent.findById(rent.id, (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        res.status = "Started";
                        res.active = true;
                        res.startTimestamp = new Date();
                        res.save();
                        var driver = getDriver({ id: res.driver._id });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('rent', res);

                        if (res.passenger) {
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('rent', res);
                            })
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('tripEnded', (trip) => {
        console.log("completed", trip)
        if (started && trip && trip.id && trip.totalDistance != null && trip.totalDistance != undefined) {
            try {
                Ride.findById(trip.id, async (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        if (res.status != "Completed") {
                            var discount = setting.discount ? setting.discount : 0;
                            var tax = setting.tax ? setting.tax : 15;
                            var companyCut = setting.companyCut ? setting.companyCut : 15;
                            var date = new Date();
                            var tsts = new Date(res.pickupTimestamp);
                            var durationInMinute = ((date.getTime() - tsts.getTime()) / 1000) / 60;
                            var cutFromDriver = 0;
                            var fare = 0;
                            if (res.type == "corporate") {
                                fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin);
                                cutFromDriver = (- fare * (companyCut / 100)) + fare;
                            } else if (res.type == "normal") {
                                fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin) - discount;
                                cutFromDriver = (- fare * (companyCut / 100)) + discount;
                            } else if (res.type == "bid") {
                                fare = trip.bidAmount;
                                cutFromDriver = - fare * (companyCut / 100);
                            } else {
                                fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin) - discount;
                                cutFromDriver = (- fare * (companyCut / 100)) + discount;
                            }
                            res.status = "Completed";
                            res.totalDistance = trip.totalDistance;
                            res.discount = discount;
                            res.companyCut = companyCut;
                            res.tax = tax;
                            res.fare = fare;
                            res.endTimestamp = date;
                            res.active = false;
                            res.save();

                            console.log({ res });

                            if (res.ticket) {
                                console.log("has ticket =========");
                                Ticket.updateOne({ _id: res.ticket }, { amount: fare, timestamp: new Date(), ride: res.id }, (err, res) => {
                                    if (err) console.log({ err });
                                    if (res) {
                                        console.log("ticket updated");
                                    }
                                });
                            }

                            updateWallet({id, amount: cutFromDriver});

                            Vehicle.updateOne({ _id: vehicleId }, { online: true }, (err, res) => {
                                if (err) console.log({ err });
                                if (res) console.log("status updated", true, vehicleId);
                            });

                            if (res.createdBy == "app" && res.passenger && res.passenger.email) {
                                sendEmail(res.passenger.email, "Trip summery", "test email");
                            }
                            var driver = getDriver({ id: res.driver._id });
                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                            if (res.passenger) {
                                var passengers = getUsers({ userId: res.passenger._id });
                                passengers.forEach((passenger) => {
                                    if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                                })
                            }
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('endRent', (rent) => {
        console.log("completed", rent)
        if (started && rent && rent.id && rent.months != null && rent.days != null, rent.hours != null) {
            try {
                Rent.findById(rent.id, async (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        if (res.status != "Completed") {
                            var tax = setting.tax ? setting.tax : 15;
                            var companyCut = setting.companyCut ? setting.companyCut : 15;
                            var fare = ((rent.months * (res.vehicleType.rentPerDay * 30)) + (rent.hours * res.vehicleType.rentPerHour) + (rent.days * res.vehicleType.rentPerDay)) * rent.months > 0 ? res.vehicleType.rentDiscount / 100 : 1;
                            var cutFromDriver = - fare * (companyCut / 100);
                            res.status = "Completed";
                            res.tax = tax;
                            res.companyCut = companyCut;
                            res.fare = fare;
                            res.endTimestamp = new Date();
                            res.active = false;
                            res.save();

                            console.log({ res });

                            updateWallet({id, amount: cutFromDriver});

                            Vehicle.updateOne({ _id: vehicleId }, { online: true }, (err, res) => {
                                if (err) console.log({ err });
                                if (res) console.log("status updated", true, vehicleId);
                            });

                            if (res.passenger && res.passenger.email) {
                                sendEmail(res.passenger.email, "rent summery", "test email");
                            }
                            var driver = getDriver({ id: res.driver._id });
                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('rent', res);

                            if (res.passenger) {
                                var passengers = getUsers({ userId: res.passenger._id });
                                passengers.forEach((passenger) => {
                                    if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('rent', res);
                                })
                            }
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('cancelTrip', (trip) => {
        if (started && trip) {
            try {
                Ride.findById(trip.id, (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        res.status = "Canceled";
                        res.endTimestamp = new Date();
                        res.cancelledBy = "Driver";
                        res.cancelledReason = trip.reason ? trip.reason : "";
                        res.active = false;
                        res.save();
                        Vehicle.updateOne({ _id: vehicleId }, { online: true }, (err, res) => {
                            if (err) console.log({ err });
                            if (res) console.log("status updated", true, vehicleId);
                        });
                        var driver = getDriver({ id: res.driver._id });
                        if (driver) {
                            io.of('/driver-socket').to(driver.socketId).emit('trip', res);
                            io.of('/driver-socket').to(driver.socketId).emit('status', { "status": true });
                        }

                        if (res.passenger) {
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                            })
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('cancelRent', (rent) => {
        if (started && rent) {
            try {
                Rent.findById(rent.id, (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        res.status = "Canceled";
                        res.endTimestamp = new Date();
                        res.cancelledBy = "Driver";
                        res.cancelledReason = rent.reason ? rent.reason : "";
                        res.active = false;
                        res.save();
                        Vehicle.updateOne({ _id: vehicleId }, { online: true }, (err, res) => {
                            if (err) console.log({ err });
                            if (res) console.log("status updated", true, vehicleId);
                        });
                        var driver = getDriver({ id: res.driver._id });
                        if (driver) {
                            io.of('/driver-socket').to(driver.socketId).emit('rent', res);
                            io.of('/driver-socket').to(driver.socketId).emit('status', { "status": true });
                        }

                        if (res.passenger) {
                            var passengers = getUsers({ userId: res.passenger._id });
                            passengers.forEach((passenger) => {
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('rent', res);
                            })
                        }
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('disconnect', () => {
        if (started) {
            removeDriver({ id });
            Vehicle.updateOne({ _id: vehicleId }, { online: false }, (err, res) => {
                if (err) console.log("error on disconnect ", err);
                if (res) {
                    console.log("Driver disconnected", id, vehicleId);
                }
            });
        }
    });
}