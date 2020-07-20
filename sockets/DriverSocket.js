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

        socket.on('init', (driverInfo) => {
            console.log(driverInfo)
            if (driverInfo && driverInfo.id && driverInfo.vehicleId && driverInfo.fcm && driverInfo.location && driverInfo.location.lat && driverInfo.location.long) {
                id = driverInfo.id;
                vehicleId = driverInfo.vehicleId;
                location = driverInfo.location;
                fcm = driverInfo.fcm;
                started = true;

                Vehicle.update({ "_id": vehicleId }, {
                    fcm,
                    position: {
                        type: "Point",
                        coordinates: [
                            location.long,
                            location.lat
                        ]
                    }
                });
                addDriver({ driverId: id, vehicleId, fcm, socketId: socket.id });
            } else {
                return { error: "Invalid data" };
            }
        })

        socket.on('changeLocation', (newLocation) => {
            if (newLocation && newLocation.lat && newLocation.long) {
                Vehicle.update({ "_id": vehicleId }, {
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

        socket.on('changeStatus', (online) => {
            Vehicle.update({ "_id": vehicleId }, { online });
        });

        socket.on('updateRequest', (request) => {
            console.log("request update")
            updateRequest({ passengerId: request.passengerId, driverId: request.driverId, status: request.status });
            getRequest().updateStatus(request.status);
        });

        socket.on('arrived', async (tripId) => {
            if (tripId) {
                try {
                    await Ride.updateOne({ _id: tripId }, { status: "Arrived" });
                    const updatedRide = await Ride.findById(tripId);

                    if (updatedRide && updatedRide.status == "Arrived") {
                        var driver = getDriver({ driverId: updatedRide.driver });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('arrived');

                        var passenger = getUser({ userId: updatedRide.passenger });
                        if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('driverArrived');
                    } else {
                        console.log("Status not changed");
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('startTrip', async (tripId) => {
            if (tripId) {
                try {
                    await Ride.updateOne({ _id: tripId }, { status: "Started" });
                    const updatedRide = await Ride.findById(tripId);

                    if (updatedRide && updatedRide.status == "Started") {
                        var driver = getDriver({ driverId: updatedRide.driver });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('tripStarted');

                        var passenger = getUser({ userId: updatedRide.passenger });
                        if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('tripStarted');
                    } else {
                        console.log("Status not changed");
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        });

        socket.on('tripEnded', async (trip) => {
            if (trip && trip.id) {
                try {
                    await Ride.updateOne({ _id: trip.id }, { status: "Completed" });
                    const updatedRide = await Ride.findById(trip.id);

                    if (updatedRide && updatedRide.status == "Completed") {
                        var driver = getDriver({ driverId: updatedRide.driver });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('tripEnded');

                        var passenger = getUser({ userId: updatedRide.passenger });
                        if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('tripEnded');
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
            console.log("Driver disconnected");
            removeDriver({ driverId: id })
        });
    }
}