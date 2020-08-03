const Vehicle = require("../models/Vehicle");
const DriverObject = require('../models/DriverObject');
const { addDriver, removeDriver, getDriver } = require('../containers/driversContainer');
const { getRequest, updateRequest, getDriverRequest } = require('../containers/requestContainer');
const Ride = require('../models/Ride');
const { getUser } = require("../containers/usersContainer");
const { sendEmail } = require("../controllers/TripController");

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
            if (!started && driverInfo && driverInfo.id && driverInfo.vehicleId && driverInfo.fcm && driverInfo.location && driverInfo.location.lat && driverInfo.location.long, driverInfo.token) {
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

                        if (res) {
                            socket.emit('trip', res);
                            socket.emit('status', { "status": false });
                        } else {
                            var request = getDriverRequest({driverId: id});
                            if (Request) socket.emit('request', request);
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
            if (newLocation && newLocation.lat && newLocation.long) {
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
            if (trip && trip.id) {
                try {
                    Ride.findById(trip.id, (err, res) => {
                        if (err) console.log(err);
                        if (res) {
                            res.status = "Arrived";
                            res.save();
                            var driver = getDriver({ id: res.driver._id });
                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                            var passenger = getUser({ userId: res.passenger._id });
                            if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                        }
                    }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('startTrip', async (trip) => {
            console.log("start trip", trip)
            if (trip && trip.id) {
                try {
                    Ride.findById(trip.id, (err, res) => {
                        if (err) console.log(err);
                        if (res) {
                            res.status = "Started";
                            res.pickupTimestamp = new Date();
                            res.save();
                            var driver = getDriver({ id: res.driver._id });
                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

                            var passenger = getUser({ userId: res.passenger._id });
                            if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                        }
                    }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('tripEnded', async (trip) => {
            console.log("completed", trip)
            if (trip && trip.id && trip.totalDistance) {
                try {
                    Ride.findById(trip.id, (err, res) => {
                        if (err) console.log(err);
                        if (res) {
                            if (res.status != "Completed") {
                                var date = new Date();
                                var tsts = new Data(pickupTimestamp);
                                var durationInMinute = ((date.getTime() - tsts.getTime()) / 1000) / 60;
                                res.status = "Completed";
                                res.totalDistance = trip.totalDistance;
                                res.fare = (trip.totalDistance * res.vehicleType.pricePerKM) + res.vehicleType.baseFare + (durationInMinute * res.vehicleType.pricePerMin);
                                res.endTimestamp = date;
                                res.active = false;
                                res.save();

                                if (res.createdBy == "app") {
                                    sendEmail(res);
                                }
                                var driver = getDriver({ id: res.driver._id });
                                if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', res);

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

        socket.on('cancelTrip', async (trip) => {
            if (trip) {
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

                            var passenger = getUser({ userId: res.passenger._id });
                            if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                        }
                    }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('disconnect', async () => {
            removeDriver({ id });
            await Vehicle.update({ _id: vehicleId }, { online: false });
            console.log("Driver disconnected", id, vehicleId);
        });
    }
}