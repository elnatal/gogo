const { addUser, removeUser, getUser } = require('../containers/usersContainer');
const { getDriver } = require('../containers/driversContainer');
const { addRequest, updateRequest, getRequest, removeRequest } = require('../containers/requestContainer');
const { getNearbyDrivers, search } = require('./core');
const Request = require('../models/Request');
const User = require('../models/User');
const Ride = require('../models/Ride');
const VehicleType = require('../models/VehicleType');
const { default: Axios } = require('axios');

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
                        if (!requestedDrivers.includes(v._id) && vehicle == null && v.driver && ((data.vehicleType == "5f14516e312e7600177815b6") ? true : v.vehicleType == data.vehicleType)) {
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
                                    coordinate: {
                                        lat: request.pickupLocation.lat,
                                        long: request.pickupLocation.long
                                    },
                                },
                                dropOffAddress: {
                                    name: request.dropOffLocation.name ? request.dropOffLocation.name : "__",
                                    coordinate: {
                                        lat: request.dropOffLocation.lat,
                                        long: request.dropOffLocation.long
                                    }

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
                                            var pickup = createdRide.pickUpAddress.name;
                                            var dropOff = createdRide.dropOffAddress.name;

                                            if (pickup == "__") {
                                                pickup = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + createdRide.pickUpAddress.lat + "," + createdRide.pickUpAddress.long + "&key=AIzaSyBayzRMZ5Q2f3tLE1UwQQoMta-1vSlH3_U");
                                            }
                                            
                                            if (dropOff == "__") {
                                                dropOff = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + createdRide.dropOffAddress.lat + "," + createdRide.dropOffAddress.long + "&key=AIzaSyBayzRMZ5Q2f3tLE1UwQQoMta-1vSlH3_U");
                                            }

                                            Promise.all([pickup, dropOff]).then(value => {
                                                if (typeof(value[0]) != "string") createdRide.pickUpAddress.name = value[0].status == "OK" ? value[0].results[0].formatted_address : "__";
                                                if (typeof(value[1]) != "string") createdRide.dropOffAddress.name = value[1].status == "OK" ? value[1].results[0].formatted_address : "__";
                                                createdRide.save();
                                                console.log("ride", createdRide);
                                                var passenger = getUser({ userId: id });
                                                if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', createdRide);
    
                                                var driver = getDriver({ driverId: request.driverId })
                                                if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', createdRide);
                                            });
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
                            res.endTimestamp = new Date();
                            res.cancelledBy = "Passenger";
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
            clearInterval(interval);
            removeUser({ userId: id });
            console.log("Passenger disconnected", id);
        })
    }
}
