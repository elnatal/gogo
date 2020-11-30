class RentObject {
    passengerId;
    passenger
    driverId;
    driver;
    startTimestamp;
    endTimestamp;
    vehicleType;
    pickUpAddress;
    vehicleId;
    note;
    type;
    dispatcherId;
    status;
    createdBy;
    timestamp;
    updateCallback;

    constructor({passengerId, driverId, driver, createdBy, timestamp, passenger, startTimestamp, note, dispatcherId, endTimestamp, vehicleId, pickUpAddress, vehicleType, status, updateCallback}) {
        this.passengerId = passengerId,
        this.driverId = driverId;
        this.driver = driver;
        this.passenger = passenger;
        this.timestamp = timestamp;
        this.createdBy = createdBy;
        this.vehicleId = vehicleId;
        this.type = "rent";
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
