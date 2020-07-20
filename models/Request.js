class Request {
    passengerId;
    driverId;
    pickupLocation;
    dropOffLocation;
    vehicleType;
    #status;
    updateCallback;
    constructor({passengerId, driverId, pickupLocation, dropOffLocation, vehicleType, status, updateCallback}) {
        this.passengerId = passengerId;
        this.driverId = driverId;
        this.pickupLocation = pickupLocation;
        this.vehicleType = vehicleType;
        this.dropOffLocation = dropOffLocation;
        this.#status = status;
        this.updateCallback = updateCallback;
    }

    updateStatus(status) {
        this.#status = status;
        this.updateCallback(this.#status);
    }

    getStatus() {
        return this.#status;
    }
}

module.exports = Request;