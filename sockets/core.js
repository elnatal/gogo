const Vehicle = require('../models/Vehicle');
const VehicleType = require('../models/VehicleType');
const User = require('../models/User');
const { default: Axios } = require('axios');
const Request = require('../models/Request');
const Ride = require('../models/Ride');
const { getDriver } = require('../containers/driversContainer');
const { addRequest, updateRequest } = require('../containers/requestContainer');
const { addDispatcher, getDispatcher, removeDispatcher } = require('../containers/dispatcherContainer');
const { default: Axios } = require('axios');
const Setting = require('../models/Setting');

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
            }, 'position vehicleType driver').find((err, res) => {
                if (err) return err;
                if (res) {
                    let drivers = JSON.stringify(res);
                    return resolve(drivers);
                }
            })
        } else {
            return reject("Invalid location or distance");
        }
    })
}

function search({ pickupLocation, dropOffLocation, userId }) {
    var requestedDrivers = [];
    var drivers = [];

    var interval = setInterval(async () => {
        drivers = await getNearbyDrivers(pickupLocation, 1000);
        if (drivers.length) {
            try {
                var drivers = await getNearbyDrivers({ location, distance: 1000 });
                socket.emit('nearDrivers', drivers);
            } catch (err) {
                console.log(err);
            }
            setInterval()
        } else {
            clearInterval(interval);
        }
    }, 5000)
}

const searchForDispatcher = (data) => {
    console.log("search", data);
    var requestedDrivers = [];
    var driverFound = false;
    var canceled = false;
    var passengerId = "";
    var schedule = null;
    var setting = await Setting.findOne();

    console.log({ setting });

    if (data.schedule && data.schedule != undefined) {
        schedule = new Date(data.schedule);
    }

    const vehicleTypeData = await VehicleType.findById(data.vehicleType);

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

    const passenger = await User.findOne({ phoneNumber: data.phone });
    if (passenger) {
        passengerId = passenger._id;
    } else {
        const newPassenger = await User.create({ phoneNumber: data.phone, firstName: data.name ? data.name : "_", lastName: "_" });
        if (newPassenger) {
            passengerId = newPassenger._id;
        }
    }


    var pickup = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?place_id=" + data.pickUpAddress + "&key=" + setting.mapKey);

    var dropOff = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?place_id=" + data.dropOffAddress + "&key=" + setting.mapKey);

    Promise.all([pickup, dropOff]).then(value => {
        console.log("promise")
        if (value[0].status == 200 && value[0].data.status == "OK") {
            console.log("status ok pul");
            pua.name = value[0].data.results[0].formatted_address;
            pua.lat = value[0].data.results[0].geometry.location.lat;
            pua.long = value[0].data.results[0].geometry.location.lng;
        } else {
            pua.name = "_";
            console.log("wrong response pul", value[0])
        }

        if (value[1].status == 200 && value[1].data.status == "OK") {
            console.log("status ok pul");
            doa.name = value[1].data.results[0].formatted_address;
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
                socket.emit("searching");
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

    // sendRequest();


    async function sendRequest() {
        console.log("requesting");
        var vehicle;
        var vehicles = [];
        vehicles = JSON.parse(await getNearbyDrivers({ location: pua, distance: setting.searchRadius ? setting.searchRadius * 1000 : 10000 }));

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
            var request = new Request({
                passengerId: passengerId,
                driverId: vehicle.driver,
                type: "normal",
                schedule,
                vehicleId: vehicle._id,
                bidAmount: null,
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
                ticket: null,
                corporate: false,
                dropOffAddress: {
                    name: doa.name,
                    coordinate: {
                        lat: doa.lat,
                        long: doa.long
                    },
                },
                status: "inRequest",
                updateCallback
            })
            addRequest({ newRequest: request });
            console.log({ request });
            socket.emit("request", request);
            var driver = getDriver({ id: request.driverId })
            if (driver) io.of('/driver-socket').to(driver.socketId).emit('request', request);

            setTimeout(() => {
                if (!driverFound && !canceled) {
                    updateRequest({ passengerId: request.passengerId, driverId: request.driverId, status: "Expired" });
                }
            }, setting && setting.requestTimeout ? setting.requestTimeout * 1000 : 10000);
        } else {
            console.log("no diver found");
            socket.emit("noAvailableDriver");
        }
    }

    async function updateCallback(request) {
        var status = request.getStatus();
        if (status == "Declined") {
            sendRequest();
        } else if (status == "Expired") {
            var driver = getDriver({ id: request.driverId })
            if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestExpired');
            sendRequest();
        } else if (status == "Canceled") {
            canceled = true;
            var driver = getDriver({ id: request.driverId });
            if (driver) io.of('/driver-socket').to(driver.socketId).emit('requestCanceled');

            var dispatcher = getDispatcher({ dispatcherId: id });
            if (dispatcher) io.of('/dispatcher-socket').to(dispatcher.socketId).emit('requestCanceled');
        } else if (status == "Accepted") {
            driverFound = true;

            try {
                var ride = await Ride.create({
                    driver: request.driverId,
                    passenger: request.passengerId,
                    vehicle: request.vehicleId,
                    type: request.type,
                    schedule: request.schedule,
                    corporate: null,
                    bidAmount: request.bidAmount,
                    route: request.route,
                    note: request.note,
                    ticket: null,
                    pickUpAddress: request.pickUpAddress,
                    dropOffAddress: request.dropOffAddress,
                    vehicleType: request.vehicleType._id,
                    status: request.schedule ? "Scheduled" : "Accepted",
                    active: request.schedule ? false : true,
                    createdBy: "dispatcher",
                });

                const createdRide = await Ride.findById(ride._id).populate('driver').populate('vehicleType').populate('vehicle').populated('passenger');
                console.log({ createdRide });

                var dispatcher = getDispatcher({ dispatcherId: id });
                if (dispatcher) io.of('/dispatcher-socket').to(dispatcher.socketId).emit('trip', createdRide);

                var driver = getDriver({ id: request.driverId })
                if (driver) io.of('/driver-socket').to(driver.socketId).emit('trip', createdRide);
            } catch (error) {
                console.log(error);
            }
        }
        console.log("status updated passenger")
        console.log(status);
    }
}

module.exports = { getNearbyDrivers, search, searchForDispatcher };