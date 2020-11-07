const Vehicle = require('../models/Vehicle');
const VehicleType = require('../models/VehicleType');
const User = require('../models/User');
const { default: Axios } = require('axios');
const Request = require('../models/Request');
const RentObject = require('../models/RentObject');
const Ride = require('../models/Ride');
const Rent = require('../models/Rent');
const { getDriver } = require('../containers/driversContainer');
const { addRequest, updateRequest, getAllRequests } = require('../containers/requestContainer');
const { getAllDispatchers } = require('../containers/dispatcherContainer');
const Setting = require('../models/Setting');
const { getIO } = require('./io');
const { sendNotification } = require('../services/notificationService');
const { getAllRents, updateRent, addRent } = require('../containers/rentContainer');
const { addTrip } = require('../containers/tripContainer');
const Ticket = require('../models/Ticket');

function getNearbyDrivers({ location, distance }) {
    return new Promise((resolve, reject) => {
        if (distance && location) {
            Vehicle.find({
                online: true,
                active: true,
                position: {
                    $near: {
                        $maxDistance: distance,
                        $geometry: {
                            type: "Point",
                            coordinates: [location.long, location.lat]
                        }
                    }
                }
            }, 'position vehicleType driver lastTripTimestamp', (err, res) => {
                if (err) return reject(err);
                if (res) {
                    var vehicles = res.map((vehicle) => {
                        var distanceInKM = calculateDistance(location, { lat: vehicle.position.coordinates[1], long: vehicle.position.coordinates[0] });
                        var lastWorkTime = (vehicle.lastTripTimestamp) ? new Date(vehicle.lastTripTimestamp).getTime() : 0;
                        var currentTime = new Date().getTime();
                        radiusInKM = distance / 1000;
                        var point = (((radiusInKM - distanceInKM) * 100) / radiusInKM) + (currentTime - lastWorkTime);
                        return {
                            _id: vehicle._id,
                            driver: vehicle.driver,
                            vehicleType: vehicle.vehicleType,
                            distance: distanceInKM,
                            position: vehicle.position,
                            point
                        };
                    });
                    return resolve(JSON.stringify(vehicles.sort((a, b) => (a.point > b.point) ? -1 : ((b.point > a.point) ? 1 : 0))));

                }
            })
        } else {
            return reject("Invalid location or distance");
        }
    })

    function calculateDistance(from, to) {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(to.lat - from.lat);  // deg2rad below
        var dLon = deg2rad(to.long - from.long);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(from.lat)) * Math.cos(deg2rad(to.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180)
    }
}

const searchForDispatcher = async (socket, data) => {
    var io = getIO();
    console.log("search", data);
    var setting = await Setting.findOne();
    console.log({ setting });
    var type = "normal";
    if (data.type && data.type != undefined) {
        type = data.type;
    }
    var requestedDrivers = [];
    var driverFound = false;
    var canceled = false;
    var passengerId = "";
    var passenger = null;
    var schedule = null;
    var corporate = false;

    var requestCount = 1;
    if (type == "bid" && setting.bidDriversPerRequest && setting.bidDriversPerRequest > 1) {
        requestCount = setting.bidDriversPerRequest;
    }
    var sentRequestCount = 0;
    var receivedResponse = 0;
    var vehicleTypeData;

    if (data.vehicleTypeData) {
        vehicleTypeData = data.vehicleTypeData
    } else {
        vehicleTypeData = await VehicleType.findById(data.vehicleType);
    }

    if (data.schedule && data.schedule != undefined) {
        schedule = new Date(data.schedule);
    }

    if (data.ticket && data.ticket != undefined) corporate = true;


    var pua = {
        lat: 0,
        long: 0,
        name: ""
    }

    var doa = {
        lat: 0,
        long: 0,
        name: ""
    }

    var route;

    if (data.passengerId) {
        passengerId = data.passengerId;
        if (data.passenger) {
            passenger = data.passenger
        } else {
            passenger = await User.findById(data.passengerId);
        }
    } else {
        passenger = await User.findOne({ phoneNumber: data.phone });
        if (passenger) {
            passengerId = passenger._id;
        } else {
            const newPassenger = await User.create({ phoneNumber: data.phone, firstName: data.name ? data.name : "_", lastName: "_" });
            if (newPassenger) {
                passenger = newPassenger
                passengerId = newPassenger._id;
            }
        }
    }

    if (data.route && data.pickUpAddress.name && data.dropOffAddress.name && data.pickUpAddress.coordinate && data.dropOffAddress.coordinate) {
        route = data.route;
        doa.name = data.dropOffAddress.name;
        doa.lat = data.dropOffAddress.coordinate.lat;
        doa.long = data.dropOffAddress.coordinate.long;
        pua.name = data.pickUpAddress.name;
        pua.lat = data.pickUpAddress.coordinate.lat;
        pua.long = data.pickUpAddress.coordinate.long;
        sendRequest();
    } else if (data.pickUpAddress && data.pickUpAddress.place_id && data.pickUpAddress.name && data.dropOffAddress && data.dropOffAddress.name && data.dropOffAddress.place_id) {
        var pickup = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?place_id=" + data.pickUpAddress.place_id + "&key=" + setting.mapKey);

        var dropOff = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?place_id=" + data.dropOffAddress.place_id + "&key=" + setting.mapKey);

        Promise.all([pickup, dropOff]).then(value => {
            console.log("promise")
            if (value[0].status == 200 && value[0].data.status == "OK") {
                console.log("status ok pul");
                pua.name = data.pickUpAddress.name;
                pua.lat = value[0].data.results[0].geometry.location.lat;
                pua.long = value[0].data.results[0].geometry.location.lng;
            } else {
                pua.name = "_";
                console.log("wrong response pul", value[0])
            }

            if (value[1].status == 200 && value[1].data.status == "OK") {
                console.log("status ok pul");
                doa.name = data.dropOffAddress.name;
                doa.lat = value[1].data.results[0].geometry.location.lat;
                doa.long = value[1].data.results[0].geometry.location.lng;
            } else {
                doa.name = "_";
                console.log("wrong response dol", value[1])
            }

            Axios.get('https://api.mapbox.com/directions/v5/mapbox/driving/' + pua.long + ',' + pua.lat + ';' + doa.long + ',' + doa.lat + '?radiuses=unlimited;&geometries=geojson&access_token=pk.eyJ1IjoidGluc2FlLXliIiwiYSI6ImNrYnFpdnNhajJuNTcydHBqaTA0NmMyazAifQ.25xYVe5Wb3-jiXpPD_8oug').then((routeObject) => {
                if (routeObject && routeObject.data && routeObject.data.routes && routeObject.data.routes[0] && routeObject.data.routes[0].geometry && routeObject.data.routes[0].geometry.coordinates) {
                    route = { coordinates: routeObject.data.routes[0].geometry.coordinates, distance: routeObject.data.routes[0].distance, duration: routeObject.data.routes[0].duration };
                    console.log({ pua });
                    console.log({ doa });
                    console.log({ route });
                    sendRequest();
                } else {
                    console.log("========================== something went wrong =============================")
                }
            }).catch((err) => {
                console.log({ err });
            });
        }).catch((error) => {
            console.log({ error });
        });
    } else {
        console.log("Invalid Data!");
    }

    // sendRequest();


    async function sendRequest() {
        console.log("requesting");
        sentRequestCount = 0;
        receivedResponse = 0;
        var vehicles = [];

        var availableVehicles = [];

        if (data.singleDriver) {
            console.log("single driver");
            availableVehicles.push({ _id: data.vehicle, driver: data.driver });
        } else {
            vehicles = JSON.parse(await getNearbyDrivers({ location: pua, distance: schedule && setting.scheduleSearchRadius ? setting.scheduleSearchRadius * 1000 : setting.searchRadius ? setting.searchRadius * 1000 : 10000 }));

            console.log({ vehicles });
            vehicles.forEach((v) => {
                if (sentRequestCount < requestCount && !requestedDrivers.includes(v._id) && v.driver && ((vehicleTypeData && vehicleTypeData.name && vehicleTypeData.name.toLowerCase() == "any") ? true : v.vehicleType == data.vehicleType)) {
                    console.log("here");
                    availableVehicles.push(v);
                    requestedDrivers.push(v._id)
                    sentRequestCount += 1;
                }
            });
        }

        if (availableVehicles.length > 0) {
            var sentRequests = [];
            for (let index = 0; index < availableVehicles.length; index++) {
                var request = new Request({
                    passengerId: passengerId,
                    passenger,
                    driverId: availableVehicles[index].driver,
                    type,
                    dispatcherId: data.dispatcherId,
                    schedule,
                    vehicle: availableVehicles[index],
                    vehicleId: availableVehicles[index]._id,
                    bidAmount: data.bidAmount && type == "bid" ? data.bidAmount : null,
                    pickUpAddress: {
                        name: pua.name,
                        coordinate: {
                            lat: pua.lat,
                            long: pua.long
                        },
                    },
                    route,
                    note: data.note ? data.note : "",
                    vehicleType: vehicleTypeData,
                    ticket: corporate ? data.ticket : null,
                    corporate,
                    createdBy: 'dispatcher',
                    dropOffAddress: {
                        name: doa.name,
                        coordinate: {
                            lat: doa.lat,
                            long: doa.long
                        },
                    },
                    status: "inRequest",
                    timestamp: new Date().getTime(),
                    updateCallback
                })
                sentRequests.push(request)
                addRequest({ newRequest: request });
                socket.emit("searching");

                const requests = getAllRequests('dispatcher');
                const rents = getAllRents('dispatcher');

                var rentAndRequests = [...requests, ...rents];

                const dispatchers = getAllDispatchers();

                dispatchers.forEach((dispatcher) => {
                    io.of('/dispatcher-socket').to(dispatcher.socketId).emit("requests", rentAndRequests);
                });

                console.log({ request });
                socket.emit("request", request);
                var driver = getDriver({ id: request.driverId })
                if (driver) {
                    console.log("driver socket exist ==============");
                    io.of('/driver-socket').to(driver.socketId).emit('request', request);
                    sendNotification(driver.fcm, { title: "Request", body: "You have new trip request" });
                    Vehicle.updateOne({ _id: request.vehicleId }, { online: false, lastTripTimestamp: new Date() }, (err, res) => { });
                } else {
                    console.log("no driver socket");
                    updateRequest({ passengerId: request.passengerId, driverId: request.driverId, status: "Expired" });
                }
            }
            setTimeout(() => {
                if (!driverFound && !canceled) {
                    sentRequests.forEach((request) => {
                        updateRequest({ passengerId: request.passengerId, driverId: request.driverId, status: "Expired" });
                    })
                    sendRequest();
                }
            }, setting && setting.requestTimeout ? setting.requestTimeout * 1000 : 10000);
        } else {
            canceled = true;
            console.log("no diver found");
            socket.emit("noAvailableDriver");
        }
    }

    async function updateCallback(request) {
        if (!driverFound && !canceled) {
            const requests = getAllRequests('dispatcher');
            const rents = getAllRents('dispatcher');
    
            var rentAndRequests = [...requests, ...rents];
    
            const dispatchers = getAllDispatchers();
    
            dispatchers.forEach((dispatcher) => {
                io.of('/dispatcher-socket').to(dispatcher.socketId).emit("requests", rentAndRequests);
            });
            var status = request.getStatus();
            if (status == "Declined") {
                receivedResponse += 1;
                var driver = getDriver({ id: request.driverId });
                if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestCanceled');
                Vehicle.updateOne({ _id: request.vehicleId }, { online: true }, (err, res) => { });
                if (!data.singleDriver && sentRequestCount <= receivedResponse) {
                    sendRequest();
                }
            } else if (status == "Expired") {
                var driver = getDriver({ id: request.driverId })
                if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestExpired');
                Vehicle.updateOne({ _id: request.vehicleId }, { online: true }, (err, res) => { });
                // if (!data.singleDriver) {
                //     sendRequest();
                // }
            } else if (status == "Canceled") {
                canceled = true;
                var driver = getDriver({ id: request.driverId });
                if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestCanceled');
    
                // var dispatcher = getDispatcher({ dispatcherId: id });
                // if (dispatcher) io.of('/dispatcher-socket').to(dispatcher.socketId).emit('requestCanceled');
            } else if (status == "Accepted" && !driverFound && !canceled) {
                driverFound = true;
                console.log("trip accepted========================");
                var ticket;
                if (request.corporate && request.ticket) {
                    ticket = await Ticket.findById(request.ticket);
                    ticket.active = false;
                    ticket.save();
                }
                try {
                    Ride.create({
                        driver: request.driverId,
                        passenger: request.passengerId,
                        vehicle: request.vehicleId,
                        type: request.type,
                        schedule: request.schedule,
                        corporate: ticket && ticket.corporate ? ticket.corporate : null,
                        bidAmount: request.bidAmount,
                        route: request.route,
                        note: request.note,
                        dispatcher: request.dispatcherId,
                        ticket: request.ticket,
                        pickUpAddress: request.pickUpAddress,
                        dropOffAddress: request.dropOffAddress,
                        vehicleType: request.vehicleType._id,
                        status: request.schedule ? "Scheduled" : "Accepted",
                        active: request.schedule ? false : true,
                        createdBy: "dispatcher",
                    }, (err, ride) => {
                        if (err) console.log(err);
                        if (ride) {
                            console.log(ride);
                            // socket.emit('status', { "status": false });
                            Ride.findById(ride._id, async (err, createdRide) => {
                                if (err) console.log(err);
                                if (createdRide) {
                                    console.log("ride", createdRide);
                                    addTrip(createdRide);
    
                                    var driver = getDriver({ id: request.driverId })
                                    if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', createdRide);
    
                                    Vehicle.updateOne({ _id: request.vehicleId }, { online: request.schedule ? true : false }, (err, res) => { });
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
        } else {
            var driver = getDriver({ id: request.driverId })
            if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestExpired');
            Vehicle.updateOne({ _id: request.vehicleId }, { online: true }, (err, res) => { });
        }
    }
}

const rentForDispatcher = async (socket, data) => {
    var io = getIO();
    console.log("starting rent");
    var setting = await Setting.findOne();
    console.log({ setting });
    var requestedDrivers = [];
    var driverFound = false;
    var canceled = false;
    var passengerId = "";
    var passenger = null;
    const vehicleTypeData = await VehicleType.findById(data.vehicleType);

    var pua = {
        lat: 0,
        long: 0,
        name: ""
    }

    if (data.passengerId) {
        passengerId = data.passengerId;
        passenger = await User.findById(data.passengerId);
    } else {
        passenger = await User.findOne({ phoneNumber: data.phone });
        if (passenger) {
            passengerId = passenger._id;
        } else {
            const newPassenger = await User.create({ phoneNumber: data.phone, firstName: data.name ? data.name : "_", lastName: "_" });
            if (newPassenger) {
                passenger = newPassenger
                passengerId = newPassenger._id;
            }
        }
    }

    if (data.pickUpAddress.name && data.pickUpAddress.coordinate) {
        pua.name = data.pickUpAddress.name;
        pua.lat = data.pickUpAddress.coordinate.lat;
        pua.long = data.pickUpAddress.coordinate.long;
        sendRequest();
    }
    else if (data.pickUpAddress && data.pickUpAddress.place_id && data.pickUpAddress.name) {
        Axios.get("https://maps.googleapis.com/maps/api/geocode/json?place_id=" + data.pickUpAddress.place_id + "&key=" + setting.mapKey).then((res) => {
            if (res.status == 200 && res.data.status == "OK") {
                console.log("status ok pul");
                pua.name = data.pickUpAddress.name;
                pua.lat = res.data.results[0].geometry.location.lat;
                pua.long = res.data.results[0].geometry.location.lng;
            } else {
                pickUpAddress.name = "_";
                console.log("wrong response pul", res)
            }
            sendRequest()
        });
    } else {
        console.log("Invalid Data!");
    }

    async function sendRequest() {
        var vehicle;
        var vehicles = [];
        vehicles = JSON.parse(await getNearbyDrivers({ location: pua, distance: setting.rentSearchRadius ? setting.rentSearchRadius * 1000 : 10000 }));

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
                passengerId,
                passenger,
                driverId: vehicle.driver,
                dispatcherId: data.dispatcherId,
                startTimestamp: data.startTimestamp,
                note: data.note ? data.note : "",
                endTimestamp: data.endTimestamp,
                pickUpAddress: {
                    name: pua.name,
                    coordinate: {
                        lat: pua.lat,
                        long: pua.long
                    },
                },
                vehicleId: vehicle._id,
                vehicleType: vehicleTypeData,
                status: "inRequest",
                createdBy: 'dispatcher',
                timestamp: new Date().getTime(),
                updateCallback
            });

            addRent({ newRent: rentObject });
            console.log({ rentObject });
            socket.emit("searching");

            const requests = getAllRequests('dispatcher');
            const rents = getAllRents('dispatcher');

            var rentAndRequests = [...requests, ...rents];

            const dispatchers = getAllDispatchers();

            dispatchers.forEach((dispatcher) => {
                io.of('/dispatcher-socket').to(dispatcher.socketId).emit("requests", rentAndRequests);
            });

            socket.emit("rentRequest", rentObject);


            var driver = getDriver({ id: rentObject.driverId })
            console.log({ driver });
            if (driver) {
                console.log("driver socket exist ==============");
                io.of('/driver-socket').to(driver.socketId).emit('rentRequest', rentObject);
                sendNotification(driver.fcm, { title: "Rent request", body: "You have new rent request" });
                Vehicle.updateOne({ _id: rentObject.vehicleId }, { online: false }, (err, res) => { });

                setTimeout(() => {
                    if (!driverFound && !canceled) {
                        updateRent({ passengerId: rentObject.passengerId, driverId: rentObject.driverId, status: "Expired" });
                        sendRequest();
                    }
                }, setting && setting.requestTimeout ? setting.requestTimeout * 1000 : 10000);
            } else {
                console.log("no driver socket");
                updateRent({ passengerId: rentObject.passengerId, driverId: rentObject.driverId, status: "Expired" });
            }
        } else {
            canceled = true;
            console.log("no diver found");
            socket.emit("noAvailableDriver");
        }
    }

    function updateCallback(rentObject) {
        if (!driverFound && !canceled) {
            console.log("changed", rentObject);
            console.log("status", rentObject.getStatus());

            const requests = getAllRequests('dispatcher');
            const rents = getAllRents('dispatcher');

            var rentAndRequests = [...requests, ...rents];

            const dispatchers = getAllDispatchers();

            dispatchers.forEach((dispatcher) => {
                io.of('/dispatcher-socket').to(dispatcher.socketId).emit("requests", rentAndRequests);
            });

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
            } else if (status == "Accepted" && (!driverFound && !canceled)) {
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
                        dispatcher: rentObject.dispatcherId,
                        active: true,
                        status: "Accepted",
                        createdBy: "dispatcher",
                    }, (error, rent) => {
                        if (error) console.log({ rent });
                        if (rent) {
                            Rent.findById(rent._id, async (error, createdRent) => {
                                if (error) console.log({ error });
                                if (createdRent) {
                                    console.log({ createdRent });

                                    var passengers = getUsers({ userId: rentObject.passengerId });
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
        } else {
            var driver = getDriver({ id: request.driverId })
            if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestExpired');
            Vehicle.updateOne({ _id: request.vehicleId }, { online: true }, (err, res) => { });
        }
    }

}

module.exports = { getNearbyDrivers, searchForDispatcher, rentForDispatcher };