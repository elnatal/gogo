const { addUser, removeUser, getUser } = require('../containers/usersContainer');
const { getDriver } = require('../containers/driversContainer');
const { addRequest, updateRequest, getRequest, removeRequest } = require('../containers/requestContainer');
const { getNearbyDrivers, search } = require('./core');
const Request = require('../models/Request');
const User = require('../models/User');
const Ride = require('../models/Ride');
const VehicleType = require('../models/VehicleType');

module.exports = function (io) {
    return function (socket) {
        console.log("new passenger connection", socket.id);
        var id = "";
        var fcm = "";
        var location = null;
        var started = false;

        io.of('/passenger-socket').to(socket.id).emit('test');

        var interval = setInterval(async () => {
            if (id && location) {
                try {
                    var drivers = await getNearbyDrivers({ location, distance: 100000 });
                    socket.emit('nearDrivers', drivers);
                } catch (err) {
                    console.log(err);
                }
            }
        }, 5000)

        socket.on("init", async (passengerInfo) => {
            console.log(passengerInfo)
            if (passengerInfo && passengerInfo.id && passengerInfo.fcm && passengerInfo.location && passengerInfo.location.lat && passengerInfo.location.long) {
                id = passengerInfo.id;
                location = passengerInfo.location;
                fcm = passengerInfo.fcm;
                started = true;
                try {
                    Ride.findOne({ active: true, passenger: id }, (err, res) => {
                        if (err) console.log(err);
                        if (res) {
                            socket.emit('trip', res);
                        }
                    }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');

                    var drivers = await getNearbyDrivers({ location, distance: 100 });
                    socket.emit('nearDrivers', drivers);
                } catch (err) {
                    console.log(err);
                }
                User.update({ "_id": id }, { fcm });
                addUser({ userId: id, socketId: socket.id, fcm });
            } else {
                return { error: "Invalid data" };
            }
        });

        socket.on('changeLocation', async (newLocation) => {
            if (newLocation && newLocation.lat, newLocation.long) {
                location = newLocation;
                if (started) {
                    try {
                        var drivers = await getNearbyDrivers({ location, distance: 100 });
                        socket.emit('nearDrivers', drivers);
                    } catch (err) {
                        console.log(err);
                    }
                }
            }
        });

        socket.on('search', async (data) => {
            if (started && data && data.pickupLocation && data.dropOffLocation && data.vehicleType) {
                console.log("search")
                var requestedDrivers = [];
                var driverFound = false;
                var canceled = false;
                sendRequest();


                async function sendRequest() {
                    var vehicle;
                    var vehicles = [];
                    vehicles = JSON.parse(await getNearbyDrivers({ location: data.pickupLocation, distance: 10000 }));

                    vehicles.forEach((v) => {
                        console.log(vehicles);
                        if (!requestedDrivers.includes(v._id) && vehicle == null && v.driver && v.vehicleType == data.vehicleType) {
                            console.log("here");
                            vehicle = v;
                            requestedDrivers.push(v._id)
                            return;
                        }
                    });

                    if (vehicle) {
                        var request = new Request({
                            passengerId: id,
                            driverId: vehicle.driver,
                            vehicleId: vehicle._id,
                            pickupLocation: data.pickupLocation,
                            vehicleType: data.vehicleType,
                            dropOffLocation: data.dropOffLocation,
                            status: "inRequest",
                            updateCallback
                        })
                        addRequest({ newRequest: request });
                        socket.emit("request", request);
                        var driver = getDriver({ driverId: request.driverId })
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('request', request);

                        setTimeout(() => {
                            if (!driverFound && !canceled) {
                                updateRequest({ passengerId: request.passengerId, driverId: request.driverId, status: "Expired" });
                                sendRequest();
                            }
                        }, 10000);
                    } else {
                        console.log("no diver found");
                        socket.emit("noAvailableDriver");
                    }
                }

                function updateCallback(request) {
                    console.log("changed", request);
                    console.log("status", request.getStatus());
                    var status = request.getStatus();
                    if (status == "Declined") {
                        sendRequest();
                    } else if (status == "Expired") {
                        var driver = getDriver({ driverId: request.driverId })
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestExpired');
                    } else if (status == "Canceled") {
                        canceled = true;
                        var driver = getDriver({ driverId: request.driverId });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestCanceled');

                        var passenger = getUser({ userId: request.passengerId });
                        if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('requestCanceled');
                    } else if (status == "Accepted") {
                        driverFound = true;
                        try {
                            Ride.create({
                                passenger: request.passengerId,
                                driver: request.driverId,
                                vehicle: request.vehicleId,
                                pickUpAddress: {
                                    name: request.pickupLocation.name ? request.pickupLocation.name : "__",
                                    coordinate: request.pickupLocation,
                                },
                                dropOffAddress: {
                                    name: request.dropOffLocation.name ? request.dropOffLocation.name : "__",
                                    coordinate: request.dropOffLocation

                                },
                                vehicleType: request.vehicleType,
                                status: "Accepted",
                                active: true,
                                createdBy: "app",
                            }, (err, ride) => {
                                if (err) console.log(err);
                                if (ride) {
                                    console.log(ride);
                                    Ride.findById(ride._id, (err, createdRide) => {
                                        if (createdRide) {

                                            console.log("ride", createdRide);
                                            var passenger = getUser({ userId: id });
                                            if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', createdRide);

                                            var driver = getDriver({ driverId: request.driverId })
                                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', createdRide);
                                        }
                                    }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                                }
                            });

                        } catch (error) {
                            console.log(error);
                        }
                    }
                    console.log("status updated passenger")
                    console.log(status);
                }
            } else {
                console.log("incomplete information")
            }
        });

        socket.on('cancelRequest', (request) => {
            updateRequest({ passengerId: request.passengerId, driverId: null, status: "Canceled" });
        });

        socket.on('cancelTrip', async (trip) => {
            if (trip) {
                try {
                    Ride.findById(trip.id, (err, res) => {
                        if (err) console.log(err);
                        if (res) {
                            res.status = "Canceled";
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
            clearInterval(interval);
            removeUser({ userId: id });
            console.log("Passenger disconnected", id);
        })
    }
}
