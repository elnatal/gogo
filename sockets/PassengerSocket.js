const { addUser, removeUser, getUser } = require('../containers/usersContainer');
const { getDriver } = require('../containers/driversContainer');
const { addRequest, updateRequest, getRequest, removeRequest } = require('../containers/requestContainer');
const { getNearbyDrivers, search } = require('./core');
const Request = require('../models/Request');
const User = require('../models/User');
const Ride = require('../models/Ride');
const VehicleType = require('../models/VehicleType');
const { default: Axios } = require('axios');
const Vehicle = require('../models/Vehicle');

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
            if (started && data && data.pickUpAddress && data.dropOffAddress && data.vehicleType) {
                console.log("search")
                var requestedDrivers = [];
                var driverFound = false;
                var canceled = false;

                var pickup = data.pickUpAddress.name;
                var dropOff = data.dropOffAddress.name;

                if (!pickup) {
                    pickup = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + data.pickUpAddress.lat + "," + data.pickUpAddress.long + "&key=AIzaSyBayzRMZ5Q2f3tLE1UwQQoMta-1vSlH3_U");
                    console.log("pickup", pickup);
                }

                if (!dropOff) {
                    dropOff = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + data.dropOffAddress.lat + "," + data.dropOffAddress.long + "&key=AIzaSyBayzRMZ5Q2f3tLE1UwQQoMta-1vSlH3_U");
                    console.log("drpOff", dropOff);
                }

                Promise.all([pickup, dropOff]).then(value => {
                    console.log(value[0].data);
                    if (typeof(value[0].data) != typeof(" ")) {
                        if (value[0].status == 200 && value[0].data.status == "OK") {
                            console.log("status ok pul");
                            data.pickUpAddress.name = value[0].data.results[0].formatted_address;
                        } else {
                            data.pickUpAddress.name = "_";
                            console.log("wrong response pul", value[0])
                        }
                    } else {
                        console.log("wrong data pul", value[0])
                    }
        
                    if (typeof(value[1].data) != typeof(" ")) {
                        if (value[1].status == 200 && value[1].data.status == "OK") {
                            console.log("status ok pul");
                            data.dropOffAddress.name = value[1].data.results[0].formatted_address;
                        } else {
                            data.dropOffAddress.name = "_";
                            console.log("wrong response dol", value[1])
                        }
                    } else {
                        console.log("wrong data dol", value[1])
                    }
                    console.log(data)
                    sendRequest();
                });

                async function sendRequest() {
                    var vehicle;
                    var vehicles = [];
                    vehicles = JSON.parse(await getNearbyDrivers({ location: data.pickUpAddress, distance: 10000 }));

                    vehicles.forEach((v) => {
                        console.log({vehicles});
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
                            pickUpAddress: {
                                name: data.pickUpAddress.name,
                                coordinate: {
                                    lat: data.pickUpAddress.lat,
                                    long: data.pickUpAddress.long
                                },
                            },
                            vehicleType: data.vehicleType,
                            dropOffAddress: {
                                name: data.dropOffAddress.name,
                                coordinate: {
                                    lat: data.dropOffAddress.lat,
                                    long: data.dropOffAddress.long
                                },
                            },
                            status: "inRequest",
                            updateCallback
                        })
                        addRequest({ newRequest: request });
                        console.log({request});
                        socket.emit("request", request);
                        var driver = getDriver({ id: request.driverId })
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
                        var driver = getDriver({ id: request.driverId })
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestExpired');
                    } else if (status == "Canceled") {
                        canceled = true;
                        var driver = getDriver({ id: request.driverId });
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
                                pickUpAddress: request.pickUpAddress,
                                dropOffAddress: request.dropOffAddress,
                                vehicleType: request.vehicleType,
                                status: "Accepted",
                                active: true,
                                createdBy: "app",
                            }, (err, ride) => {
                                if (err) console.log(err);
                                if (ride) {
                                    console.log(ride);
                                    Vehicle.update({ _id: request.vehicleId }, { online: false });
                                    socket.emit('status', { "status": false });
                                    Ride.findById(ride._id, (err, createdRide) => {
                                        if (createdRide) {
                                            console.log("ride", createdRide);
                                            var passenger = getUser({ userId: id });
                                            if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', createdRide);

                                            var driver = getDriver({ id: request.driverId })
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
                            res.endTimestamp = new Date();
                            res.cancelledBy = "Passenger";
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

        socket.on('disconnect', () => {
            clearInterval(interval);
            removeUser({ userId: id });
            console.log("Passenger disconnected", id);
        })
    }
}
