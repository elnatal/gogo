const { schema } = require("./Vehicle");

class Request {
    passengerId;
    driverId;
    pickUpAddress;
    dropOffAddress;
    route;
    vehicleType;
    vehicleId;
    corporate;
    ticket;
    note;
    type;
    schedule;
    bidAmount;
    #status;
    updateCallback;
    constructor({passengerId, driverId, pickUpAddress, schedule, dropOffAddress, note, bidAmount, type, vehicleType, vehicleId, status, route, ticket, corporate, updateCallback}) {
        this.passengerId = passengerId;
        this.driverId = driverId;
        this.pickUpAddress = pickUpAddress;
        this.vehicleId = vehicleId;
        this.note = note;
        this.type = type;
        this.bidAmount = bidAmount;
        this.route = route;
        this.corporate = corporate;
        this.schedule = schedule;
        this.ticket = ticket;
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