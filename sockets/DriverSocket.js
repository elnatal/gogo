const Vehicle = require("../models/Vehicle");
const { addDriver, removeDriver, getDriver } = require('../containers/driversContainer');
const  { getRequest } = require('../containers/requestContainer');

module.exports = function (io) {
    return function (socket) {
        console.log("new connection", socket.id);
        var id = "";
        var vehicleId = "";
        var fcm = "";
        var location = null;

        socket.on('init', (driverInfo) => {
            console.log(driverInfo)
            if (driverInfo && driverInfo.id && driverInfo.vehicleId && driverInfo.fcm && driverInfo.location && driverInfo.location.lat && driverInfo.location.long) {
                id = driverInfo.id;
                vehicleId = driverInfo.vehicleId;
                location = driverInfo.location;
                fcm = driverInfo.fcm;

                Vehicle.update({ "_id": vehicleId }, { fcm });
                addDriver({ driverId: id, vehicleId, fcm, socketId: socket.id });
            } else {
                return { error: "Invalid data" };
            }
        })

        socket.on('locationChange', (location) => {
            
        })

        socket.on('changeStatus', (online) => {
            Vehicle.update({ "_id": vehicleId }, { online });
        })

        socket.on('updateRequest', (request) => {
            console.log("request update")
            getRequest({passengerId: request.passengerId, driverId: request.driverId}).updateStatus(request.status);
        })

        socket.on('startTrip', () => {

        })

        socket.on('disconnect', () => {
            console.log("Driver disconnected");
            removeDriver({driverId: id})
        })
    }
}