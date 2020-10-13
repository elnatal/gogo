const { addUser, removeUser, getUser, getUsers } = require('../containers/usersContainer');
const { getDriver } = require('../containers/driversContainer');
const { addRequest, updateRequest, getRequest, removeRequest } = require('../containers/requestContainer');
const { getNearbyDrivers, search } = require('./core');
const Request = require('../models/Request');
const User = require('../models/User');
const Ride = require('../models/Ride');
const VehicleType = require('../models/VehicleType');
const { default: Axios } = require('axios');
const Vehicle = require('../models/Vehicle');
const Ticket = require('../models/Ticket');
const Setting = require('../models/Setting');
const RentObject = require('../models/RentObject');
const { addRent, updateRent } = require('../containers/rentContainer');
const Rent = require('../models/Rent');
const { getIO } = require('./io');
const { sendNotification } = require('../services/notificationService');

module.exports = (socket) => {
    console.log("new passenger connection", socket.id);
    var io = getIO();
    var id = "";
    var fcm = "";
    var location = null;
    var started = false;

    var interval = setInterval(() => {
        if (id && location) {
            try {
                getNearbyDrivers({ location, distance: 100000 }).then((drivers) => {
                    socket.emit('nearDrivers', drivers);
                });
            } catch (err) {
                console.log(err);
            }
        }
    }, 5000)

    socket.on("init", (passengerInfo) => {
        console.log(passengerInfo)
        if (passengerInfo && passengerInfo.id && passengerInfo.fcm && passengerInfo.location && passengerInfo.location.lat && passengerInfo.location.long) {
            id = passengerInfo.id;
            location = passengerInfo.location;
            fcm = passengerInfo.fcm;
            started = true;
            try {
                var ride = Ride.findOne({ active: true, passenger: id }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');

                var rent = Rent.findOne({ active: true, passenger: id }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');

                Promise.all([ride, rent]).then((values) => {
                    if (values[0]) {
                        socket.emit("trip", values[0]);
                    } else if (values[1] && values[1].status != "Started") {
                        socket.emit("rent", values[1]);
                    }
                }).catch((error) => {
                    console.log({ error });
                })

                getNearbyDrivers({ location, distance: 100 }).then((drivers) => {
                    socket.emit('nearDrivers', drivers);
                });
            } catch (err) {
                console.log(err);
            }
            User.updateOne({ "_id": id }, { fcm }, (err, res) => {
                if (err) console.log({ err });
                if (res) console.log("fcm updated");
            });
            addUser({ userId: id, socketId: socket.id, fcm });
        } else {
            return { error: "Invalid data" };
        }
    });

    socket.on('changeLocation', (newLocation) => {
        if (newLocation && newLocation.lat, newLocation.long) {
            location = newLocation;
            if (started) {
                try {
                    getNearbyDrivers({ location, distance: 100 }).then((drivers) => {
                        socket.emit('nearDrivers', drivers);
                    });
                } catch (err) {
                    console.log(err);
                }
            }
        }
    });

    socket.on('search', async (data) => {
        if (started && data && data.pickUpAddress && data.dropOffAddress && data.vehicleType) {
            console.log("search")
            var setting = await Setting.findOne();
            console.log({ setting });
            var type = "normal";
            if (data.type && data.type != undefined) {
                type = data.type;
            }
            var requestedDrivers = [];
            var driverFound = false;
            var canceled = false;
            var corporate = false;
            var schedule = null;


            var requestCount = 1;
            if (type == "bid" && setting.bidDriversPerRequest && setting.bidDriversPerRequest > 1) {
                requestCount = setting.bidDriversPerRequest;
            }
            var sentRequestCount = 0;
            var receivedResponse = 0;


            const vehicleTypeData = await VehicleType.findById(data.vehicleType);

            if (data.schedule && data.schedule != undefined) {
                schedule = new Date(data.schedule);
            }

            if (data.ticket && data.ticket != undefined) corporate = true;

            var pickup = data.pickUpAddress.name;
            var dropOff = data.dropOffAddress.name;

            if (!pickup) {
                pickup = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + data.pickUpAddress.lat + "," + data.pickUpAddress.long + "&key=" + setting.mapKey);
                console.log("pickup", pickup);
            }

            if (!dropOff) {
                dropOff = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + data.dropOffAddress.lat + "," + data.dropOffAddress.long + "&key=" + setting.mapKey);
                console.log("drpOff", dropOff);
            }

            var route = Axios.get('https://api.mapbox.com/directions/v5/mapbox/driving/' + data.pickUpAddress.long + ',' + data.pickUpAddress.lat + ';' + data.dropOffAddress.long + ',' + data.dropOffAddress.lat + '?radiuses=unlimited;&geometries=geojson&access_token=pk.eyJ1IjoidGluc2FlLXliIiwiYSI6ImNrYnFpdnNhajJuNTcydHBqaTA0NmMyazAifQ.25xYVe5Wb3-jiXpPD_8oug');

            Promise.all([pickup, dropOff, route]).then(value => {
                console.log(value[0].data);
                if (typeof (value[0]) != typeof (" ")) {
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

                if (typeof (value[1]) != typeof (" ")) {
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

                if (value[2] && value[2].data && value[2].data.routes && value[2].data.routes[0] && value[2].data.routes[0].geometry && value[2].data.routes[0].geometry.coordinates) {
                    data.route = { coordinates: value[2].data.routes[0].geometry.coordinates, distance: value[2].data.routes[0].distance, duration: value[2].data.routes[0].duration };
                }
                console.log(data)
                sendRequest();
            });

            async function sendRequest() {
                sentRequestCount = 0;
                receivedResponse = 0;
                var vehicle;
                var vehicles = [];
                vehicles = JSON.parse(await getNearbyDrivers({ location: data.pickUpAddress, distance: setting.searchRadius ? setting.searchRadius * 1000 : 10000 }));

                var availableVehicles = [];
                vehicles.forEach((v) => {
                    console.log({ vehicles });
                    if (sentRequestCount < requestCount && !requestedDrivers.includes(v._id) && v.driver && ((vehicleTypeData && vehicleTypeData.name && vehicleTypeData.name.toLowerCase() == "any") ? true : v.vehicleType == data.vehicleType)) {
                        console.log("here");
                        availableVehicles.push(v);
                        requestedDrivers.push(v._id)
                        sentRequestCount += 1;
                    }
                });

                if (availableVehicles.length > 0) {
                    for (let index = 0; index < availableVehicles.length; index++) {
                        var request = new Request({
                            passengerId: id,
                            driverId: availableVehicles[index].driver,
                            vehicleId: availableVehicles[index]._id,
                            type,
                            vehicle: availableVehicles[index],
                            schedule,
                            bidAmount: data.bidAmount && type == "bid" ? data.bidAmount : null,
                            pickUpAddress: {
                                name: data.pickUpAddress.name,
                                coordinate: {
                                    lat: data.pickUpAddress.lat,
                                    long: data.pickUpAddress.long
                                },
                            },
                            route: data.route,
                            note: data.note ? data.note : "",
                            corporate,
                            ticket: corporate ? data.ticket : null,
                            vehicleType: vehicleTypeData,
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
                        console.log({ request });
                        socket.emit("request", request);
                        var driver = getDriver({ id: request.driverId })
                        console.log({ driver });
                        if (driver) {
                            console.log("driver socket exist ***********");
                            io.of('/driver-socket').to(driver.socketId).emit('request', request);
                            sendNotification(driver.fcm, { title: "Request", body: "You have a new trip request" });
                            Vehicle.updateOne({ _id: request.vehicleId }, { online: false, lastTripTimestamp: new Date() }, (err, res) => { });

                            setTimeout(() => {
                                if (!driverFound && !canceled) {
                                    receivedResponse += 1;
                                    updateRequest({ passengerId: request.passengerId, driverId: request.driverId, status: "Expired" });
                                }
                            }, setting && setting.requestTimeout ? setting.requestTimeout * 1000 : 10000);
                        } else {
                            console.log("no driver socket");
                            updateRequest({ passengerId: request.passengerId, driverId: request.driverId, status: "Expired" });
                        }
                    }
                } else {
                    canceled = true;
                    console.log("no diver found");
                    socket.emit("noAvailableDriver");
                }
            }

            function updateCallback(request) {
                if (!driverFound || !canceled) {
                    console.log("changed", request);
                    console.log("status", request.getStatus());
                    var status = request.getStatus();
                    if (status == "Declined") {
                        receivedResponse += 1;
                        var driver = getDriver({ id: request.driverId });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestCanceled');
                        Vehicle.updateOne({ _id: request.vehicleId }, { online: true }, (err, res) => { });
                        if (sentRequestCount <= receivedResponse) {
                            sendRequest();
                        }
                    } else if (status == "Expired") {
                        var driver = getDriver({ id: request.driverId })
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestExpired');
                        Vehicle.updateOne({ _id: request.vehicleId }, { online: true }, (err, res) => { });
                        if (sentRequestCount <= receivedResponse) {
                            sendRequest();
                        }
                    } else if (status == "Canceled") {
                        console.log("request canceled");
                        canceled = true;
                        var driver = getDriver({ id: request.driverId });
                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestCanceled');

                        var passengers = getUsers({ userId: request.passengerId });
                        console.log({ passengers });
                        passengers.forEach((passenger) => {
                            console.log({ passenger });
                            if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('requestCanceled');
                        })
                        Vehicle.updateOne({ _id: request.vehicleId }, { online: true }, (err, res) => { });
                    } else if (status == "Accepted") {
                        driverFound = true;
                        var ticket;
                        if (request.corporate && request.ticket) {
                            Ticket.updateOne({ _id: request.ticket }, { active: false }, (error, ticket) => {
                                if (error) {
                                    console.log({ error });
                                }
                                if (ticket) {
                                    console.log({ ticket });
                                }
                            });
                        }
                        try {
                            Ride.create({
                                passenger: request.passengerId,
                                driver: request.driverId,
                                vehicle: request.vehicleId,
                                type: request.type,
                                corporate: ticket && ticket.corporate ? ticket.corporate : null,
                                schedule: request.schedule,
                                bidAmount: request.bidAmount,
                                pickUpAddress: request.pickUpAddress,
                                dropOffAddress: request.dropOffAddress,
                                vehicleType: request.vehicleType._id,
                                route: request.route,
                                note: request.note,
                                ticket: request.ticket,
                                status: request.schedule ? "Scheduled" : "Accepted",
                                active: request.schedule ? false : true,
                                createdBy: "app",
                            }, (err, ride) => {
                                if (err) console.log(err);
                                if (ride) {
                                    console.log(ride);
                                    // socket.emit('status', { "status": false });
                                    Ride.findById(ride._id, async (err, createdRide) => {
                                        if (createdRide) {
                                            console.log("ride", createdRide);

                                            var passengers = getUsers({ userId: id });
                                            passengers.forEach((passenger) => {
                                                if (passenger) {
                                                    io.of('/passenger-socket').to(passenger.socketId).emit('trip', createdRide);
                                                    sendNotification(passenger.fcm, { title: "Request accepted", body: "Driver is on the way" });
                                                }
                                            })

                                            var driver = getDriver({ id: request.driverId })
                                            if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', createdRide);

                                            Vehicle.update({ _id: request.vehicleId }, { online: request.schedule ? true : false }, (err, res) => { });
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
            }
        } else {
            console.log("incomplete information")
        }
    });

    socket.on('cancelRequest', (request) => {
        console.log("cancel request");
        updateRequest({ passengerId: request.passengerId, driverId: null, status: "Canceled" });
    });

    socket.on('cancelTrip', async (trip) => {
        if (trip) {
            try {
                Ride.findById(trip.id, async (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        res.status = "Canceled";
                        res.endTimestamp = new Date();
                        res.cancelledBy = "Passenger";
                        res.cancelledReason = trip.reason ? trip.reason : "";
                        res.active = false;
                        res.save();
                        Vehicle.updateOne({ _id: res.vehicle._id }, { online: true }, (error, response) => { });
                        var driver = getDriver({ id: res.driver._id });
                        if (driver) {
                            io.of('/driver-socket').to(driver.socketId).emit('trip', res);
                            sendNotification(driver.fcm, { title: "Canceled", body: "Trip has been canceled" });
                            // io.of('/driver-socket').to(driver.socketId).emit('status', { "status": true });
                        }

                        var passengers = getUsers({ userId: res.passenger._id });
                        passengers.forEach((passenger) => {
                            if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('trip', res);
                        })
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('cancelRent', async (rent) => {
        if (rent) {
            try {
                Rent.findById(rent.id, async (err, res) => {
                    if (err) console.log(err);
                    if (res) {
                        res.status = "Canceled";
                        res.endTimestamp = new Date();
                        res.cancelledBy = "Passenger";
                        res.cancelledReason = rent.reason ? rent.reason : "";
                        res.active = false;
                        res.save();
                        Vehicle.updateOne({ _id: res.vehicle._id }, { online: true }, (error, response) => { });
                        var driver = getDriver({ id: res.driver._id });
                        if (driver) {
                            io.of('/driver-socket').to(driver.socketId).emit('rent', res);
                            sendNotification(driver.fcm, { title: "Canceled", body: "Rent has been canceled" });
                            // io.of('/driver-socket').to(driver.socketId).emit('status', { "status": true });
                        }

                        var passengers = getUsers({ userId: res.passenger._id });
                        passengers.forEach((passenger) => {
                            if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('rent', res);
                        })
                    }
                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
            } catch (error) {
                console.log(error);
            }
        }
    });

    socket.on('rent', async (data) => {
        if (started && data && data.pickUpAddress && data.vehicleType && data.startTimestamp && data.endTimestamp) {
            console.log("starting rent");
            var setting = await Setting.findOne();
            console.log({ setting });
            var requestedDrivers = [];
            var driverFound = false;
            var canceled = false;
            var vehicleTypeData;

            VehicleType.findById(data.vehicleType).then((res) => {
                vehicleTypeData = res;
            }).catch(error => console.log({ error }));

            var pickUpAddress = data.pickUpAddress;

            if (!pickUpAddress.name) {
                Axios.get("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + data.pickUpAddress.lat + "," + data.pickUpAddress.long + "&key=" + setting.mapKey).then((res) => {
                    if (res.status == 200 && res.data.status == "OK") {
                        console.log("status ok pul");
                        pickUpAddress.name = res.data.results[0].formatted_address;
                    } else {
                        pickUpAddress.name = "_";
                        console.log("wrong response pul", res)
                    }
                    sendRequest()
                });
            } else {
                sendRequest();
            }

            async function sendRequest() {
                var vehicle;
                var vehicles = [];
                vehicles = JSON.parse(await getNearbyDrivers({ location: data.pickUpAddress, distance: setting.searchRadius ? setting.searchRadius * 1000 : 10000 }));

                vehicles.forEach((v) => {
                    console.log({ vehicles });
                    if (!requestedDrivers.includes(v._id) && vehicle == null && v.driver && ((vehicleTypeData && vehicleTypeData.name && vehicleTypeData.name.toLowerCase() == "any") ? true : v.vehicleType == data.vehicleType)) {
                        console.log("here");
                        vehicle = v;
                        requestedDrivers.push(v._id)
                        return;
                    }
                });

                if (vehicle) {
                    var rentObject = new RentObject({
                        passengerId: id,
                        driverId: vehicle.driver,
                        startTimestamp: data.startTimestamp,
                        note: data.note ? data.note : "",
                        endTimestamp: data.endTimestamp,
                        pickUpAddress: {
                            name: pickUpAddress.name,
                            coordinate: {
                                lat: pickUpAddress.lat,
                                long: pickUpAddress.long
                            },
                        },
                        vehicleId: vehicle._id,
                        vehicleType: vehicleTypeData,
                        status: "inRequest",
                        updateCallback
                    });

                    addRent({ newRent: rentObject });
                    console.log({ rentObject });
                    socket.emit("rentRequest", rentObject);


                    var driver = getDriver({ id: rentObject.driverId })
                    console.log({ driver });
                    if (driver) {
                        io.of('/driver-socket').to(driver.socketId).emit('rentRequest', rentObject);
                        sendNotification(driver.fcm, { title: "Rent request", body: "You have new rent request" });
                    }
                    Vehicle.updateOne({ _id: rentObject.vehicleId }, { online: false }, (err, res) => { });

                    setTimeout(() => {
                        if (!driverFound && !canceled) {
                            updateRent({ passengerId: rentObject.passengerId, driverId: rentObject.driverId, status: "Expired" });
                            sendRequest();
                        }
                    }, setting && setting.requestTimeout ? setting.requestTimeout * 1000 : 10000);
                } else {
                    canceled = true;
                    console.log("no diver found");
                    socket.emit("noAvailableDriver");
                }
            }

            function updateCallback(rentObject) {
                console.log("changed", rentObject);
                console.log("status", rentObject.getStatus());
                var status = rentObject.getStatus();

                if (status == "Declined") {
                    var driver = getDriver({ id: rentObject.driverId });
                    if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestCanceled');
                    sendRequest();
                    Vehicle.updateOne({ _id: rentObject.vehicleId }, { online: true }, (err, res) => { });
                } else if (status == "Expired") {
                    var driver = getDriver({ id: rentObject.driverId })
                    if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestExpired');
                    Vehicle.updateOne({ _id: rentObject.vehicleId }, { online: true }, (err, res) => { });
                } else if (status == "Canceled") {
                    canceled = true;
                    var driver = getDriver({ id: rentObject.driverId });
                    if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestCanceled');

                    var passengers = getUsers({ userId: rentObject.passengerId });
                    passengers.forEach((passenger) => {
                        if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('requestCanceled');
                    })
                    Vehicle.updateOne({ _id: rentObject.vehicleId }, { online: true }, (err, res) => { });
                } else if (status == "Accepted") {
                    driverFound = true;
                    try {
                        Rent.create({
                            passenger: rentObject.passengerId,
                            driver: rentObject.driverId,
                            // startTimestamp: rentObject.startTimestamp,
                            // endTimestamp: rentObject.endTimestamp,
                            pickUpAddress: rentObject.pickUpAddress,
                            note: rentObject.note,
                            vehicleType: rentObject.vehicleType._id,
                            vehicle: rentObject.vehicleId,
                            active: true,
                            status: "Accepted"
                        }, (error, rent) => {
                            if (error) console.log({ rent });
                            if (rent) {
                                Rent.findById(rent._id, async (error, createdRent) => {
                                    if (error) console.log({ error });
                                    if (createdRent) {
                                        console.log({ createdRent });

                                        var passengers = getUsers({ userId: id });
                                        passengers.forEach((passenger) => {
                                            if (passenger) io.of('/passenger-socket').to(passenger.socketId).emit('rent', createdRent);
                                            sendNotification(passenger.fcm, { title: "Rent accepted", body: "Driver is on the way" });
                                        })

                                        var driver = getDriver({ id: rentObject.driverId })
                                        if (driver) io.of('/driver-socket').to(driver.socketId).emit('rent', createdRent);

                                        Vehicle.update({ _id: rentObject.vehicleId }, { online: true }, (err, res) => { });
                                    }
                                }).populate('driver').populate('passenger').populate('vehicleType').populate('vehicle');
                            }
                        })
                    } catch (error) {
                        console.log({ error });
                    }
                }
            }
        }
    });

    socket.on('cancelRentRequest', (rentObject) => {
        updateRent({ passengerId: rentObject.passengerId, driverId: null, status: "Canceled" });
    });

    socket.on('disconnect', () => {
        clearInterval(interval);
        removeUser({ fcm });
        console.log("Passenger disconnected", id);
    })
}