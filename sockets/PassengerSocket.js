const { addUser, removeUser, getUser } = require('../containers/usersContainer');
const { addRequest, removeRequest, getRequest } = require('../containers/requestContainer');
const { getNearbyDrivers, search } = require('./core');
const Request = require('../models/Request');
const User = require('../models/User');

module.exports = function (io) {
    return function (socket) {
        console.log("new passenger connection", socket.id);
        var id = "";
        var fcm = "";
        var location = null;
        var searchInterval = false;
        var waitForResponse = false;

        io.of('/passenger-socket').to(socket.id).emit('test');

        var interval = setInterval(async () => {
            if (id && location) {
                try {
                    var drivers = await getNearbyDrivers({ location, distance: 1000 });
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
                try {
                    var drivers = await getNearbyDrivers({ location, distance: 1000 });
                    socket.emit('nearDrivers', drivers);
                } catch (err) {
                    console.log(err);
                }
                User.update({ "_id": id }, { fcm });
                addUser({ userId: id, socketId: socket.id, fcm });
            } else {
                return { error: "Invalid data" };
            }
        })

        socket.on('search', async (data) => {
            console.log("search")
            var requestedDrivers = [];


            searchInterval = setInterval(async () => {
                var vehicle;
                var vehicles = await getNearbyDrivers({ location: data.pickupLocation, distance: 1000 });

                vehicles.forEach((v) => {
                    if (!requestedDrivers.contains(v._id) && vehicle == null && v.driver && v.vehicleType == data.vehicleType) {
                        vehicle = v;
                        return;
                    }
                });

                console.log("vehicle", vehicle);

                if (vehicle) {
                    var request = new Request({
                        passengerId: id,
                        driverId: vehicle.driver,
                        pickupLocation: data.pickupLocation,
                        dropOffLocation: data.dropOffLocation,
                        status: "inRequest",
                        updateCallback
                    })

                    waitForResponse = true;
                    var sec = 0;

                    while(waitForResponse) {
                        setTimeout(() => {
                            if (waitForResponse) {
                                sec++;
                                if (sec >= 15) {
                                    waitForResponse = false;
                                }
                            }
                        }, 1000)
                    }


                } else {

                }
            }, 0);

            while (searching) {
                var vehicle;
                var vehicles = await getNearbyDrivers({ location: data.pickupLocation, distance: 1000 });

                vehicles.forEach((v) => {
                    if (!requestedDrivers.contains(v._id) && vehicle == null && v.driver && v.vehicleType == data.vehicleType) {
                        vehicle = v;
                        return;
                    }
                });

                console.log("vehicle", vehicle);

                if (vehicle) {
                    var request = new Request({
                        passengerId: id,
                        driverId: vehicle.driver,
                        pickupLocation: data.pickupLocation,
                        dropOffLocation: data.dropOffLocation,
                        status: "inRequest",
                        updateCallback
                    })

                    waitForResponse = true;
                    var sec = 0;

                    while(waitForResponse) {
                        setTimeout(() => {
                            if (waitForResponse) {
                                sec++;
                                if (sec >= 15) {
                                    waitForResponse = false;
                                }
                            }
                        }, 1000)
                    }


                } else {

                }
            }

            // search({userId: id, pickupLocation: data.pickupLocation, dropOffLocation: data.dropOffLocation});
            var request = new Request({ passengerId: id, driverId: 1, pickupLocation: data.pickupLocation, dropOffLocation: data.dropOffLocation, status: "inRequest", updateCallback });
            addRequest({ newRequest: request });

            console.log(request);

            function updateCallback(status) {
                console.log("status updated passenger")
                console.log(getRequest({ passengerId: 1, driverId: 1 }).getStatus());
                console.log(status);
            }
        })

        socket.on('disconnect', () => {
            clearInterval(interval);
            console.log("Passenger disconnected");
        })
    }
}
