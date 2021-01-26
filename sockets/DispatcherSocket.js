const { addDispatcher, removeDispatcher } = require('../containers/dispatcherContainer');
const { searchForDispatcher, rentForDispatcher } = require('./core');
const Setting = require('../models/Setting');
const { default: Axios } = require('axios');
const VehicleType = require('../models/VehicleType');
const { getAllRequests } = require('../containers/requestContainer');

module.exports = (socket) => {
    var id = "";
    var started = false;

    socket.on("init", async (dispatcherInfo) => {
        if (!started && dispatcherInfo && dispatcherInfo.id) {
            id = dispatcherInfo.id;
            started = true;
            addDispatcher({ dispatcherId: id, socketId: socket.id });

            const requests = getAllRequests('dispatcher');
            socket.emit("requests", requests);
        } else {
            return { error: "Invalid data" };
        }
    });

    socket.on('estimate', async (data) => {
        if (started && data && data.pickUpAddress && data.pickUpAddress.place_id && data.dropOffAddress && data.dropOffAddress.place_id && data.vehicleType) {
            var setting = await Setting.findOne();
            var pickup, dropOff;
            if (!data.pickUpAddress.coordinate) {
                pickup = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?place_id=" + data.pickUpAddress.place_id + "&key=" + setting.mapKey);
            }
            if (!data.dropOffAddress.coordinate) {
                dropOff = Axios.get("https://maps.googleapis.com/maps/api/geocode/json?place_id=" + data.dropOffAddress.place_id + "&key=" + setting.mapKey);
            }
            var vehicleType;

            Promise.all([pickup, dropOff, VehicleType.findById(data.vehicleType)]).then(value => {
                var pua = {};
                var doa = {};

                if (value[0] == null && data.pickUpAddress.coordinate) {
                    pua.name = data.pickUpAddress.name;
                    pua.lat = data.pickUpAddress.coordinate.lat;
                    pua.long = data.pickUpAddress.coordinate.long;
                }
                else if (value[0].status == 200 && value[0].data.status == "OK") {
\                    pua.name = data.pickUpAddress.name;
                    pua.lat = value[0].data.results[0].geometry.location.lat;
                    pua.long = value[0].data.results[0].geometry.location.lng;
                } else {
                    pua.name = "_";
                    return;
                }

                if (value[0] == null && data.dropOffAddress.coordinate) {
                    doa.name = data.dropOffAddress.name;
                    doa.lat = data.dropOffAddress.coordinate.lat;
                    doa.long = data.dropOffAddress.coordinate.long;
                }
                else if (value[1].status == 200 && value[1].data.status == "OK") {
                    doa.name = data.dropOffAddress.name;
                    doa.lat = value[1].data.results[0].geometry.location.lat;
                    doa.long = value[1].data.results[0].geometry.location.lng;
                } else {
                    doa.name = "_";
                    return;
                }

                if (value[2]) {
                    vehicleType = value[2];
                } else {
                    return;
                }

                Axios.get('https://api.mapbox.com/directions/v5/mapbox/driving/' + pua.long + ',' + pua.lat + ';' + doa.long + ',' + doa.lat + '?radiuses=unlimited;&geometries=geojson&access_token=pk.eyJ1IjoidGluc2FlLXliIiwiYSI6ImNrYnFpdnNhajJuNTcydHBqaTA0NmMyazAifQ.25xYVe5Wb3-jiXpPD_8oug').then((routeObject) => {
                    if (routeObject && routeObject.data && routeObject.data.routes && routeObject.data.routes[0] && routeObject.data.routes[0].geometry && routeObject.data.routes[0].geometry.coordinates) {
                        var route = { coordinates: routeObject.data.routes[0].geometry.coordinates, distance: routeObject.data.routes[0].distance, duration: routeObject.data.routes[0].duration };
                        var estimate = {
                            distance: route.distance / 1000,
                            duration: route.duration / 60,
                            route: route.coordinates,
                            fare: ((route.distance / 1000) * vehicleType.pricePerKM) + ((route.duration / 60) * vehicleType.pricePerMin) + vehicleType.baseFare
                        };
                        socket.emit("estimate-response", estimate);
                    }
                }).catch((error) => {
                    console.log({ error });
                });
            }).catch((error) => {
                console.log({ error });
            });
        }
    });

    socket.on('search', (data) => {
        if (started && data && data.pickUpAddress && data.dropOffAddress && data.vehicleType && data.phone) {
            if (data.vehicle && data.driver) {
                data['singleDriver'] = true;
            } else {
                data['singleDriver'] = false;
            }
            data['dispatcherId'] = id;
            searchForDispatcher(socket, data);
        }
    });

    socket.on('rent', (data) => {
        if (started && data && data.pickUpAddress && data.vehicleType && data.phone && data.startTimestamp && data.endTimestamp) {
            if (data.vehicle && data.driver) {
                data['singleDriver'] = true;
            } else {
                data['singleDriver'] = false;
            }
            data['dispatcherId'] = id;
            rentForDispatcher(socket, data);
        }
    });

    socket.on('cancelRequest', (request) => {
        updateRequest({ passengerId: passengerId, driverId: request.driverId, status: "Canceled" });
    });

    socket.on('disconnect', () => {
        removeDispatcher({ dispatcherId: id });
    })
}
