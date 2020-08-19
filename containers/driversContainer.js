const drivers = [];

const addDriver = ({ newDriver }) => {
    console.log("before driver add", drivers);
    const existingDriver = drivers.find((driver) => driver.id == newDriver.id);
    if (existingDriver) {
        if (existingDriver.token != newDriver.token) {
            existingDriver.removeDriver();
        }
        removeDriver({id: existingDriver.id});
    }
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