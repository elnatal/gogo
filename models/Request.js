class Request {
    passengerId;
    driverId;
    pickupLocation;
    dropOffLocation;
    #status;
    updateCallback;
    constructor({passengerId, driverId, pickupLocation, dropOffLocation, status, updateCallback}) {
        this.passengerId = passengerId;
        this.driverId = driverId;
        this.pickupLocation = pickupLocation;
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