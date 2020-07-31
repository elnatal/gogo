const Vehicle = require("../models/Vehicle");
const { addDriver, removeDriver, getDriver } = require('../containers/driversContainer');
const { getRequest, updateRequest } = require('../containers/requestContainer');
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

        socket.on('init', async (driverInfo) => {
            console.log(driverInfo);
            console.log("///////////////////////////////////");
            console.log("//////////// Le Nati //////////////");
            console.log("///////////////////////////////////");
            // console.log(JSON.parse(driverInfo));
            console.log("type", typeof(driverInfo));
            if (driverInfo && driverInfo.id && driverInfo.vehicleId && driverInfo.fcm && driverInfo.location && driverInfo.location.lat && driverInfo.location.long, driverInfo.token) {
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
                        if (res) {
                            socket.emit('trip', res);
                        }
                    }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');

                    const update = await Vehicle.updateOne({ _id: vehicleId }, {
                        fcm,
                        timestamp: new Date(),
                        position: {
                            type: "Point",
                            coordinates: [
                                location.long,
                                location.lat
                            ]
                        }
                    });
                    console.log("res", update);
                } catch (error) {
                    console.log(error);
                }

                addDriver(DriverObject({id, vehicleId, fcm, token, socketId: socket.id, removeDriverCallback }))
                // addDriver({ driverId: id, vehicleId, fcm, socketId: socket.id });

                function removeDriverCallback() {
                    socket.emit("unauthorized");
                    socket.disconnect();
                }
            } else {
                return { error: "Invalid data" };
            }
        })

        socket.on('updateLocation', (newLocation) => {
            console.log({newLocation});
            if (newLocation && newLocation.lat && newLocation.long) {
                Vehicle.update({ _id: vehicleId }, {
                    timestamp: new Date(),
                    position: {
                        type: "Point",
                        coordinates: [
                            newLocation.long,
                            newLocation.lat
                        ]
                    }
                }, (err, res) => {
                    console.log({res});
                });
            }
        });

        socket.on('changeStatus', async (online) => {
            console.log(typeof(online));
            console.log('vehicle id', vehicleId);
            if (started) {
                if (online != null && vehicleId) {
                    console.log('status', online);
                    const update = await Vehicle.updateOne({ _id: vehicleId }, { online });
                    console.log("updated status", update);
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
            console.log("arrived" , trip)
            if (trip && trip.id) {
                try {
                    Ride.findById(trip.id, (err, res) => {
                        if (err) console.log(err);
                        if (res) {
                            res.status = "Arrived";
                            res.save();
                            var driver = getDriver({ driverId: res.driver._id });
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
            console.log("start trip" , trip)
            if (trip && trip.id) {
                try {
                    Ride.findById(trip.id, (err, res) => {
                        if (err) console.log(err);
                        if (res) {
                            res.status = "Started";
                            res.pickupTimestamp = new Date();
                            res.save();
                            var driver = getDriver({ driverId: res.driver._id });
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
            console.log("completed" , trip)
            if (trip && trip.id && trip.totalDistance) {
                try {
                    Ride.findById(trip.id, (err, res) => {
                        if (err) console.log(err);
                        if (res) {
                            if (res.status != "Completed") {
                                res.status = "Completed";
                                res.totalDistance = trip.totalDistance; 
                                res.endTimestamp = new Date();
                                res.active = false;
                                res.save();

                                if (res.createdBy == "app") {
                                    sendEmail(res);
                                }
                                var driver = getDriver({ driverId: res.driver._id });
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
                            var driver = getDriver({ driverId: res.driver._id });
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

        socket.on('disconnect', () => {
            removeDriver({ id });
            Vehicle.update({ _id: vehicleId }, { online: false });
            console.log("Driver disconnected", id, vehicleId);
        });
    }
}