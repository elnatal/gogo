const drivers = [];

const addDriver = ({ newDriver }) => {
    console.log("before driver add", drivers);
    const existingDriver = drivers.find((driver) => driver.id == newDriver.id);
    if (existingDriver) {
        removeDriver({id: existingDriver.id});
    }
    drivers.push(newDriver);
    console.log("after driver add", drivers);
    return driver;
}

const removeDriver = ({id}) => {
    const index = drivers.findIndex((driver) => driver.id == id);

    if (index != -1) {
        drivers[index].removeDriver();
        return drivers.splice(index, 1)[0];
    }
}

const getDriver = ({id}) => drivers.find((driver) => driver.id == id);

module.exports = {addDriver, removeDriver, getDriver};