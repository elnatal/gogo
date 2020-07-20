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
                    Ride.findOne({active: true, passenger: id}, (err, res) => {
                        if (err) console.log(err);
                        if(res) {
                            socket.emit('trip', res);
                        }
                    });

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
                        socket.emit("noAvailableDriver");
                    }
                }

                async function updateCallback(request) {
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
                            var ride = await Ride.create({
                                passenger: request.passengerId,
                                driver: request.driverId,
                                pickUpAddress: {
                                    name: "String",
                                    coordinate: request.pickupLocation,
                                },
                                dropOffAddress: {
                                    name: "String",
                                    coordinate: location.dropOffLocation

                                },
                                vehicleType: request.vehicleType,
                                status: "Accepted",
                                active: true,
                                createdBy: "app",
                            });

                            const createdRide = await Ride.findById(ride._id).populate('driver').populate('passenger').populate('vehicleType');

                            var passenger = getUser({ userId: id });
                            if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('requestAccepted', createdRide);

                            var driver = getDriver({ driverId: request.driverId })
                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestAccepted', createdRide);
                        } catch (error) {
                            console.log(error);
                        }
                    }
                    console.log("status updated passenger")
                    console.log(status);
                }
            }
        });

        socket.on('cancelRequest', (request) => {
            updateRequest({ passengerId: require.passengerId, driverId: request.driverId, status: "Canceled" });
        });

        socket.on('cancelTrip', async (trip) => {
            if (trip) {
                try {
                    await Ride.updateOne({ _id: trip.id }, { status: "Canceled" });
                    const updatedRide = await Ride.findById(trip.id);

                    if (updatedRide && updatedRide.status == "Canceled") {
                        var driver = getDriver({ driverId: updatedRide.driver });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('tripCanceled', trip.id);

                        var passenger = getUser({ userId: updatedRide.passenger });
                        if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('tripCanceled', trip.id);
                    } else {
                        console.log("Status not changed");
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('disconnect', () => {
            clearInterval(interval);
            removeUser({ userId: id });
            console.log("Passenger disconnected");
        })
    }
}
