const Vehicle = require("../models/Vehicle");
const { addDriver, removeDriver } = require('../containers/driversContainer');
const { getRequest, updateRequest } = require('../containers/requestContainer');
const Ride = require('../models/Ride');
const { getUser } = require("../containers/usersContainer");

module.exports = function (io) {
    return function (socket) {
        console.log("new connection", socket.id);
        var id = "";
        var vehicleId = "";
        var fcm = "";
        var location = null;
        var started = false;

        socket.on('init', async (driverInfo) => {
            console.log(driverInfo);
            // console.log(JSON.parse(driverInfo));
            console.log("type", typeof(driverInfo));
            if (driverInfo && driverInfo.id && driverInfo.vehicleId && driverInfo.fcm && driverInfo.location && driverInfo.location.lat && driverInfo.location.long) {
                console.log("passed");
                id = driverInfo.id;
                vehicleId = driverInfo.vehicleId;
                location = driverInfo.location;
                fcm = driverInfo.fcm;
                started = true;

                try {
                    Ride.findOne({ active: true, driver: id }, (err, res) => {
                        if (err) console.log(err);
                        if (res) {
                            socket.emit('trip', res);
                        }
                    });

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

                addDriver({ driverId: id, vehicleId, fcm, socketId: socket.id });
            } else {
                return { error: "Invalid data" };
            }
        })

        socket.on('updatedLocation', (newLocation) => {
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
            console.log("request update")
            updateRequest({ passengerId: request.passengerId, driverId: request.driverId, status: request.status });
            getRequest().updateStatus(request.status);
        });

        socket.on('arrived', async (trip) => {
            if (trip && trip.id) {
                try {
                    await Ride.updateOne({ _id: trip.id }, { status: "Arrived" });
                    const updatedRide = await Ride.findById(trip.id);

                    if (updatedRide && updatedRide.status == "Arrived") {
                        var driver = getDriver({ driverId: updatedRide.driver });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', updatedRide);

                        var passenger = getUser({ userId: updatedRide.passenger });
                        if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', updatedRide);
                    } else {
                        console.log("Status not changed");
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('startTrip', async (trip) => {
            if (trip && trip.id) {
                try {
                    await Ride.updateOne({ _id: trip.id }, { status: "Started", pickupTimestamp: new Date() });
                    const updatedRide = await Ride.findById(trip.id);

                    if (updatedRide && updatedRide.status == "Started") {
                        var driver = getDriver({ driverId: updatedRide.driver });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', updatedRide);

                        var passenger = getUser({ userId: updatedRide.passenger });
                        if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', updatedRide);
                    } else {
                        console.log("Status not changed");
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('tripEnded', async (trip) => {
            if (trip && trip.id && trip.totalDistance) {
                try {
                    await Ride.updateOne({ _id: trip.id }, { status: "Completed", totalDistance: trip.totalDistance, endTimestamp: new Date(), active: false });
                    const updatedRide = await Ride.findById(trip.id);

                    if (updatedRide && updatedRide.status == "Completed") {
                        var driver = getDriver({ driverId: updatedRide.driver });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', updatedRide);

                        var passenger = getUser({ userId: updatedRide.passenger });
                        if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', updatedRide);
                    } else {
                        console.log("Status not changed");
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('cancelTrip', async (trip) => {
            if (trip) {
                try {
                    await Ride.updateOne({ _id: trip.id }, { status: "Canceled" });
                    const updatedRide = await Ride.findById(trip.id);

                    if (updatedRide && updatedRide.status == "Canceled") {
                        var driver = getDriver({ driverId: updatedRide.driver });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', updatedRide);

                        var passenger = getUser({ userId: updatedRide.passenger });
                        if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', updatedRide);
                    } else {
                        console.log("Status not changed");
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('disconnect', () => {
            Vehicle.update({ _id: vehicleId }, { online: false });
            console.log("Driver disconnected");
            removeDriver({ driverId: id })
        });
    }
}