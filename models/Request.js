class Request {
    passengerId;
    driverId;
    pickUpAddress;
    dropOffAddress;
    route;
    vehicleType;
    vehicleId;
    corporate;
    ticketNumber;
    #status;
    updateCallback;
    constructor({passengerId, driverId, pickUpAddress, dropOffAddress, vehicleType, vehicleId, status, route, ticketNumber, corporate, updateCallback}) {
        this.passengerId = passengerId;
        this.driverId = driverId;
        this.pickUpAddress = pickUpAddress;
        this.vehicleId = vehicleId;
        this.route = route;
        this.corporate = corporate;
        this.ticketNumber = ticketNumber;
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