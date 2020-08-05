const { getDriver } = require('../containers/driversContainer');
const { addRequest, updateRequest } = require('../containers/requestContainer');
const { getNearbyDrivers } = require('./core');
const Request = require('../models/Request');
const Ride = require('../models/Ride');
const { addDispatcher, getDispatcher, removeDispatcher } = require('../containers/dispatcherContainer');
const { default: Axios } = require('axios');

module.exports = function (io) {
    return function (socket) {
        console.log("new dispatcher connection", socket.id);
        var id = "";
        var started = false;

        socket.on("init", async (dispatcherInfo) => {
            console.log(dispatcherInfo)
            if (!started && dispatcherInfo && dispatcherInfo.id) {
                id = dispatcherInfo.id;
                started = true;
                addDispatcher({ dispatcherId: id, socketId: socket.id });
            } else {
                return { error: "Invalid data" };
            }
        });

        socket.on('search', async (data) => {
            if (started && data && data.pickUpAddress && data.dropOffAddress && data.vehicleType, data.name && data.phone) {
                console.log("search", data);
                var requestedDrivers = [];
                var driverFound = false;
                var canceled = false;
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


                var pickup = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?place_id=" + data.pickUpAddress + "&key=AIzaSyCG0lZ4sMamZ2WiMAFJvx6StV0pkkPbhNc");

                var dropOff = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?place_id=" + data.dropOffAddress + "&key=AIzaSyCG0lZ4sMamZ2WiMAFJvx6StV0pkkPbhNc");

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
                            console.log({pua});
                            console.log({doa});
                            console.log({route});
                            sendRequest();
                        } else {
                            console.log("========================== something went wrong =============================")
                        }
                    }).catch((err) => {
                        console.log({err});
                    });
                }).catch((error) => {
                    console.log({error});
                });

                // sendRequest();


                async function sendRequest() {
                    var vehicle;
                    var vehicles = [];
                    vehicles = JSON.parse(await getNearbyDrivers({ location: data.pua, distance: 10000 }));

                    vehicles.forEach((v) => {
                        console.log({ vehicles });
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
                                name: pua.name,
                                coordinate: {
                                    lat: pua.lat,
                                    long: pua.long
                                },
                            },
                            route: route,
                            vehicleType: data.vehicleType,
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
                        }, 10000);
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
                                passengerName: data.name,
                                passengerPhone: data.phone,
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
                            if (dispatcher) io.of('/dispatcher-socket').to(dispatcher.socketId).emit('requestAccepted', createdRide);

                            var driver = getDriver({ id: request.driverId })
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
