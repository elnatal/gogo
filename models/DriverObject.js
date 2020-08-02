class DriverObject {
    id;
    fcm;
    token;
    socketId;
    vehicleId;
    removeDriverCallback;

    constructor({id, fcm, token, socketId, vehicleId, removeDriverCallback}) {
        this.id = id;
        this.fcm = fcm;
        this.token = token;
        this.socketId = socketId;
        this.vehicleId = vehicleId;
        this.removeDriverCallback = removeDriverCallback;
    };

    removeDriver() {
        this.removeDriverCallback();
    }
}

module.exports = DriverObject;