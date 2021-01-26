class Request {
    passengerId;
    passenger;
    driverId;
    driver;
    dispatcherId;
    pickUpAddress;
    dropOffAddress;
    route;
    vehicleType;
    vehicleId;
    corporate;
    ticket;
    vehicle;
    note;
    type;
    schedule;
    bidAmount;
    status;
    createdBy;
    timestamp;
    updateCallback;
    constructor({ passengerId, driverId, driver, pickUpAddress, schedule, vehicle, dropOffAddress, passenger, dispatcherId, createdBy, timestamp, note, bidAmount, type, vehicleType, vehicleId, status, route, ticket, corporate, updateCallback }) {
        this.passengerId = passengerId;
        this.driverId = driverId;
        this.driver = driver;
        this.pickUpAddress = pickUpAddress;
        this.vehicleId = vehicleId;
        this.passenger = passenger;
        this.note = note;
        this.dispatcherId = dispatcherId;
        this.vehicle = vehicle;
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
        this.timestamp = timestamp;
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