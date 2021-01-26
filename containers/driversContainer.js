const drivers = [];

const addDriver = ({ newDriver }) => {
    drivers.push(newDriver);
    return newDriver;
}

const removeDriver = ({id}) => {
    const index = drivers.findIndex((driver) => driver.id == id);

    if (index != -1) {
        drivers.splice(index, 1)[0];
        return true;
    }
}

const getDriver = ({id}) => drivers.find((driver) => driver.id == id);

const getDrivers = ({id}) => drivers.filter((driver) => driver.id == id);

module.exports = {addDriver, removeDriver, getDriver, getDrivers};