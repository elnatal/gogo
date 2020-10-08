class RentObject {
    passengerId;
    passenger
    driverId;
    startTimestamp;
    endTimestamp;
    vehicleType;
    pickUpAddress;
    vehicleId;
    note;
    dispatcherId;
    status;
    createdBy;
    timestamp;
    updateCallback;

    constructor({passengerId, driverId, createdBy, timestamp, passenger, startTimestamp, note, dispatcherId, endTimestamp, vehicleId, pickUpAddress, vehicleType, status, updateCallback}) {
        this.passengerId = passengerId,
        this.driverId = driverId;
        this.passenger = passenger;
        this.timestamp = timestamp;
        this.createdBy = createdBy;
        this.vehicleId = vehicleId;
        this.vehicleType = vehicleType;
        this.dispatcherId = dispatcherId;
        this.pickUpAddress = pickUpAddress;
        this.note = note;
        this.startTimestamp = startTimestamp;
        this.endTimestamp = endTimestamp;
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

module.exports = RentObject;