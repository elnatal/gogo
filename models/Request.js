class Request {
    passengerId;
    driverId;
    pickupLocation;
    dropOffLocation;
    vehicleType;
    vehicleId;
    #status;
    updateCallback;
    constructor({passengerId, driverId, pickupLocation, dropOffLocation, vehicleType, vehicleId, status, updateCallback}) {
        this.passengerId = passengerId;
        this.driverId = driverId;
        this.pickupAddress = pickupLocation;
        this.vehicleId = vehicleId;
        this.vehicleType = vehicleType;
        this.dropOffAddress = dropOffLocation;
        this.#status = status;
        this.updateCallback = updateCallback;
    }

    updateStatus(status) {
        this.#status = status;
        this.updateCallback(this);
    }

    getStatus() {
        return this.#status;
    }
}

module.exports = Request;