const Vehicle = require("../models/Vehicle");
const DriverObject = require('../models/DriverObject');
const { addDriver, removeDriver, getDriver } = require('../containers/driversContainer');
const { getRequest, updateRequest, getDriverRequest } = require('../containers/requestContainer');
const Ride = require('../models/Ride');
const { getUser } = require("../containers/usersContainer");
const Setting = require("../models/Setting");
const Ticket = require("../models/Ticket");
const { sendEmail } = require("../services/emailService");

module.exports = function (io) {
    return function (socket) {
        console.log("new connection", socket.id);
        var id = "";
        var vehicleId = "";
        var fcm = "";
        var location = null;
        var started = false;
        var token = "";
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
                    Ride.findOne({ active: true, driver: id }, (err, res) => {
                        if (err) console.log(err);
                        Vehicle.updateOne({ _id: vehicleId }, {
                            fcm,
                            active: res ? false : true,
                            timestamp: new Date(),
                            position: {
                                type: "Point",
                                coordinates: [
                                    location.long,
                                    location.lat
                                ]
                            }
                        });

                        console.log({res});
                        console.log("status", res ? false : true);

                        if (res) {
                            socket.emit('trip', res);
                            console.log({res});
                            socket.emit('status', { "status": false });
                        } else {
                            var request = getDriverRequest({driverId: id});
                            if (request) socket.emit('request', request);
                            socket.emit('status', { "status": true });
                        }

                    }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                } catch (error) {
                    console.log(error);
                }

                addDriver({ newDriver: new DriverObject({ id, vehicleId, fcm, token, socketId: socket.id, removeDriverCallback }) })
                // addDriver({ driverId: id, vehicleId, fcm, socketId: socket.id });

                function removeDriverCallback() {
                    console.log("unauthorized", id);
                    socket.emit("unauthorized");
                    socket.disconnect();
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
                });
            }
        });

        socket.on('changeStatus', async (online) => {
            console.log(typeof (online));
            console.log('vehicle id', vehicleId);
            if (started) {
                if (online != null && vehicleId) {
                    console.log('status', online);
                    const update = await Vehicle.updateOne({ _id: vehicleId }, { online });
                    socket.emit('status', { "status": online });
                    // console.log("updated status", update);
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
            // getRequest().updateStatus(request.status);
        });

        socket.on('arrived', async (trip) => {
            console.log("arrived", trip)
            if (started && trip && trip.id) {
                try {
                    Ride.findById(trip.id, (err, res) => {
                        if (err) console.log(err);
                        if (res) {
                            res.status = "Arrived";
                            res.save();
                            var driver = getDriver({ id: res.driver._id });
                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                            if (res.passenger) {
                                var passenger = getUser({ userId: res.passenger._id });
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                            }
                        }
                    }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('startTrip', async (trip) => {
            console.log("start trip", trip)
            if (started && trip && trip.id) {
                try {
                    Ride.findById(trip.id, (err, res) => {
                        if (err) console.log(err);
                        if (res) {
                            res.status = "Started";
                            res.pickupTimestamp = new Date();
                            res.save();
                            var driver = getDriver({ id: res.driver._id });
                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                            if (res.passenger) {
                                var passenger = getUser({ userId: res.passenger._id });
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                            }
                        }
                    }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('tripEnded', async (trip) => {
            console.log("completed", trip)
            if (started && trip && trip.id && trip.totalDistance) {
                try {
                    Ride.findById(trip.id, async (err, res) => {
                        if (err) console.log(err);
                        if (res) {
                            if (res.status != "Completed") {
                                var setting = await Setting.findOne();
                                var discount = setting.discount ? setting.discount : 0;
                                var tax = setting.tax ? setting.tax : 15;
                                var discount = setting.discount ? setting.discount : 0;
                                var date = new Date();
                                var tsts = new Date(res.pickupTimestamp);
                                var durationInMinute = ((date.getTime() - tsts.getTime()) / 1000) / 60;
                                var fare = 0;
                                if (trip.type == "corporate") {
                                    fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin);
                                } else if (trip.type == "normal") {
                                    fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin) - discount;
                                } else if (trip.type == "bid") {
                                    fare = trip.bidAmount;
                                }
                                res.status = "Completed";
                                res.totalDistance = trip.totalDistance;
                                res.discount = discount;
                                res.tax = tax;
                                res.fare = fare;
                                res.endTimestamp = date;
                                res.active = false;
                                res.save();

                                if  (res.ticket) {
                                    Ticket.updateOne({_id: res.ticket}, {amount: fare});
                                }

                                if (res.createdBy == "app") {
                                    sendEmail("elnataldebebe@gmail.com", "test", "test email");
                                }
                                var driver = getDriver({ id: res.driver._id });
                                if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                                if (res.passenger) {
                                    var passenger = getUser({ userId: res.passenger._id });
                                    if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                                }
                            }
                        }
                    }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('cancelTrip', async (trip) => {
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
                            var driver = getDriver({ id: res.driver._id });
                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                            if (res.passenger) {
                                var passenger = getUser({ userId: res.passenger._id });
                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                            }
                        }
                    }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('disconnect', async () => {
            if (started) {
                removeDriver({ id });
                await Vehicle.updateOne({ _id: vehicleId }, { online: false });
            }
            console.log("Driver disconnected", id, vehicleId);
        });
    }
}