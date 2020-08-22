const rents = [];

const addRent = ({ newRent }) => {
    const existing = rents.find((rent) => rent.driverId == newRent.driverId && rent.passengerId == newRent.passengerId);
    if (existing) {
        removeRent({ passengerId: newRent.passengerId, driverId: newRent.driverId });
    }
    rents.push(newRent);
}

const removeRent = ({ passengerId, driverId }) => {
    const index = rents.findIndex((rent) => driverId ? rent.driverId == driverId && rent.passengerId == passengerId : rent.passengerId == passengerId);

    if (index != -1) {
        rents.splice(index, 1);
    }
}

const updateRent = ({ passengerId, driverId, status }) => {
    var rent = getRent({ passengerId, driverId });

    if (rent) {
        rent.updateStatus(status);
        removeRent({ passengerId, driverId });
    }
}

const getRent = ({ passengerId, driverId }) => rents.find((rent) =>  driverId ? rent.driverId == driverId && rent.passengerId == passengerId : rent.passengerId == passengerId);

const getDriverRent = ({driverId}) => rents.find((rent) => rent.driverId == driverId);

module.exports = { addRent, removeRent, getRent, updateRent, getDriverRent };