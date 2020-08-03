class Request {
    passengerId;
    driverId;
    pickUpAddress;
    dropOffAddress;
    route;
    vehicleType;
    vehicleId;
    #status;
    updateCallback;
    constructor({passengerId, driverId, pickUpAddress, dropOffAddress, vehicleType, vehicleId, status, route, updateCallback}) {
        this.passengerId = passengerId;
        this.driverId = driverId;
        this.pickUpAddress = pickUpAddress;
        this.vehicleId = vehicleId;
        this.route = route;
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