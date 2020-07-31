class DriverObject {
    id;
    fcm;
    token;
    socketId;
    vehicleId;
    removeDriverCallback;

    DriverObject({id, fcm, token, socketId, vehicleId, removeDriverCallback}) {
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