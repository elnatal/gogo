const drivers = [];

const addDriver = ({driverId, vehicleId, fcm, socketId}) => {
    const existingDriver = drivers.find((driver) => driver.driverId == driverId);
    if (existingDriver) {
        return existingDriver;
    } else {
        const driver = {driverId, vehicleId, fcm, socketId};
        drivers.push(driver);
        return driver;
    }
}

const removeDriver = ({driverId}) => {
    const index = drivers.findIndex((driver) => driver.driverId == driverId);

    if (index != -1) {
        return drivers.splice(index, 1)[0];
    }
}

const getDriver = ({driverId}) => drivers.find((driver) => driver.driverId == driverId);

module.exports = {addDriver, removeDriver, getDriver};