const { getDriver } = require('../containers/driversContainer');
const { addRequest, updateRequest } = require('../containers/requestContainer');
const { getNearbyDrivers } = require('./core');
const Request = require('../models/Request');
const Ride = require('../models/Ride');
const { addDispatcher, getDispatcher, removeDispatcher } = require('../containers/dispatcherContainer');

module.exports = function (io) {
    return function (socket) {
        console.log("new passenger connection", socket.id);
        var id = "";
        var started = false;

        socket.on("init", async (dispatcherInfo) => {
            console.log(dispatcherInfo)
            if (dispatcherInfo && dispatcherInfo.id) {
                id = dispatcherInfo.id;
                started = true;
                addDispatcher({ dispatcherId: id, socketId: socket.id });
            } else {
                return { error: "Invalid data" };
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
                        var dispatcher = getDispatcher({ dispatcherId: id });
                        if (dispatcher) io.of('/dispatcher-socket').to(dispatcher.socketId).emit('request', request);

                        var driver = getDriver({ driverId: request.driverId })
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('request', request);

                        setTimeout(() => {
                            if (!driverFound && !canceled) {
                                updateRequest({ passengerId: request.passengerId, driverId: request.driverId, status: "Expired" });
                                sendRequest();
                            }
                        }, 10000);
                    } else {
                        var dispatcher = getDispatcher({ dispatcherId: id });
                        if (dispatcher) io.of('/dispatcher-socket').to(dispatcher.socketId).emit('noAvailableDriver');
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

                        var dispatcher = getDispatcher({ dispatcherId: id });
                        if (dispatcher) io.of('/dispatcher-socket').to(dispatcher.socketId).emit('requestCanceled');
                    } else if (status == "Accepted") {
                        driverFound = true;

                        try {
                            var ride = await Ride.create({
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
                                createdBy: "dispatcher",
                            });

                            const createdRide = await Ride.findById(ride._id).populate('driver').populate('vehicleType');

                            var dispatcher = getDispatcher({ dispatcherId: id });
                            if (dispatcher) io.of('/dispatcher-socket').to(dispatcher.socketId).emit('requestAccepted');

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
            updateRequest({ passengerId: passengerId, driverId: request.driverId, status: "Canceled" });
        });

        socket.on('disconnect', () => {
            removeDispatcher({ dispatcherId: id });
            console.log("Dispatcher disconnected");
        })
    }
}
