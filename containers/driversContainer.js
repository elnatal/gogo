const drivers = [];

const addDriver = ({ newDriver }) => {
    console.log("before driver add", drivers);
    const existingDrivers = drivers.filter((driver) => driver.id == newDriver.id);

    existingDrivers.forEach((driver) => {
        if (driver) {
            if (driver.token != newDriver.token) {
                driver.removeDriver();
            }
            removeDriver({id: driver.id});
        }
    })
    drivers.push(newDriver);
    console.log("after driver add", drivers);
    return newDriver;
}

const removeDriver = ({id}) => {
    console.log("before driver remove", drivers);
    const index = drivers.findIndex((driver) => driver.id == id);

    if (index != -1) {
        drivers.splice(index, 1)[0];
        console.log("after driver remove", drivers);
        return true;
    }
}

const getDriver = ({id}) => drivers.find((driver) => driver.id == id);

module.exports = {addDriver, removeDriver, getDriver};