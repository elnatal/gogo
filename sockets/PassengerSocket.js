const { addUser, removeUser, getUser } = require('../containers/usersContainer');
const { getDriver } = require('../containers/driversContainer');
const { addRequest, updateRequest, getRequest, removeRequest } = require('../containers/requestContainer');
const { getNearbyDrivers, search } = require('./core');
const Request = require('../models/Request');
const User = require('../models/User');
const { remove } = require('../models/User');

module.exports = function (io) {
    return function (socket) {
        console.log("new passenger connection", socket.id);
        var id = "";
        var fcm = "";
        var location = null;

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
            var driverFound = false;
            sendRequest();


            async function sendRequest() {
                var vehicle;
                var vehicles = [];
                vehicles = JSON.parse(await getNearbyDrivers({ location: data.pickupLocation, distance: 1000000000000000 }));

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
                        dropOffLocation: data.dropOffLocation,
                        status: "inRequest",
                        updateCallback
                    })
                    addRequest({ newRequest: request });
                    socket.emit("request", request);
                    var driver = getDriver({driverId: request.driverId})
                    if (driver) io.of('/driver-socket').to(driver.socketId).emit('request', request);

                    setTimeout(() => {
                        if (!driverFound) {
                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestExpired');
                            removeRequest({passengerId: request.passengerId, driverId: request.driverId});
                            sendRequest();
                        }
                    }, 10000);
                } else {
                    socket.emit("noAvailableDriver");
                }
            }

            function updateCallback(status) {
                if (status == "declined") {
                    sendRequest();
                } else if (status == "accepted") {
                    driverFound = true;

                    // TODO:: create trip and send it to the user
                } 
                console.log("status updated passenger")
                console.log(getRequest({ passengerId: 1, driverId: 1 }).getStatus());
                console.log(status);
            }
        });

        socket.on('cancel', (request) => {
            updateRequest({passengerId: require.passengerId, driverId: request.driverId, status: "Canceled"});
        })

        socket.on('disconnect', () => {
            clearInterval(interval);
            removeUser({userId: id});
            console.log("Passenger disconnected");
        })
    }
}
