const { getDriver } = require('../containers/driversContainer');
const { addRequest, updateRequest } = require('../containers/requestContainer');
const { getNearbyDrivers, searchForDispatcher } = require('./core');
const Request = require('../models/Request');
const Ride = require('../models/Ride');
const { addDispatcher, getDispatcher, removeDispatcher } = require('../containers/dispatcherContainer');
const { default: Axios } = require('axios');
const User = require('../models/User');
const Setting = require('../models/Setting');
const VehicleType = require('../models/VehicleType');

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
            if (started && data && data.pickUpAddress && data.dropOffAddress && data.vehicleType && data.phone) {
                searchForDispatcher(io,socket, data);
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
