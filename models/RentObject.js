class RentObject {
    passengerId;
    driverId;
    startTimestamp;
    endTimestamp;
    vehicleType;
    pickUpAddress;
    vehicleId;
    #status;
    updateCallback;

    RentObject({passengerId, driverId, startTimestamp, endTimestamp, vehicleId, pickUpAddress, vehicleType, status, updateCallback}) {
        this.passengerId = passengerId,
        this.driverId = driverId;
        this.vehicleId = vehicleId;
        this.vehicleType = vehicleType;
        this.pickUpAddress = pickUpAddress;
        this.startTimestamp = startTimestamp;
        this.endTimestamp = endTimestamp;
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

module.exports = RentObject;