const { schema } = require("./Vehicle");

class Request {
    passengerId;
    passenger;
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
    status;
    createdBy;
    updateCallback;
    constructor({passengerId, driverId, pickUpAddress, schedule, dropOffAddress, passenger, createdBy, note, bidAmount, type, vehicleType, vehicleId, status, route, ticket, corporate, updateCallback}) {
        this.passengerId = passengerId;
        this.driverId = driverId;
        this.pickUpAddress = pickUpAddress;
        this.vehicleId = vehicleId;
        this.passenger = passenger;
        this.note = note;
        this.type = type;
        this.createdBy = createdBy;
        this.bidAmount = bidAmount;
        this.route = route;
        this.corporate = corporate;
        this.schedule = schedule;
        this.ticket = ticket;
        this.vehicleType = vehicleType;
        this.dropOffAddress = dropOffAddress;
        this.status = status;
        this.updateCallback = updateCallback;
    }

    updateStatus(status) {
        this.status = status;
        this.updateCallback(this);
    }

    getStatus() {
        return this.status;
    }
}

module.exports = Request;