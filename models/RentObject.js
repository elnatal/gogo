class RentObject {
    passengerId;
    driverId;
    startTimestamp;
    endTimestamp;
    vehicleType;
    pickUpAddress;
    vehicleId;
    note;
    dispatcherId;
    status;
    updateCallback;

    constructor({passengerId, driverId, startTimestamp, note, dispatcherId, endTimestamp, vehicleId, pickUpAddress, vehicleType, status, updateCallback}) {
        this.passengerId = passengerId,
        this.driverId = driverId;
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