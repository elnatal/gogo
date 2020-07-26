class Request {
    passengerId;
    driverId;
    pickupAddress;
    dropOffAddress;
    vehicleType;
    vehicleId;
    #status;
    updateCallback;
    constructor({passengerId, driverId, pickupAddress, dropOffAddress, vehicleType, vehicleId, status, updateCallback}) {
        this.passengerId = passengerId;
        this.driverId = driverId;
        this.pickupAddress = pickupAddress;
        this.vehicleId = vehicleId;
        this.vehicleType = vehicleType;
        this.dropOffAddress = dropOffAddress;
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