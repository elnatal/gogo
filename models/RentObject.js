class RentObject {
    passengerId;
    driverId;
    startTimestamp;
    endTimestamp;
    vehicleType;
    pickUpAddress;
    vehicleId;
    note;
    #status;
    updateCallback;

    constructor({passengerId, driverId, startTimestamp, note, endTimestamp, vehicleId, pickUpAddress, vehicleType, status, updateCallback}) {
        this.passengerId = passengerId,
        this.driverId = driverId;
        this.vehicleId = vehicleId;
        this.vehicleType = vehicleType;
        this.pickUpAddress = pickUpAddress;
        this.note = note;
        this.startTimestamp = startTimestamp;
        this.endTimestamp = endTimestamp;
        this.#status = status;
        this.updateCallback = updateCallback;
    }

    updateStatus(status) {
        console.log("update status");
        this.#status = status;
        this.updateCallback(this);
    }

    getStatus() {
        return this.#status;
    }
}

module.exports = RentObject;