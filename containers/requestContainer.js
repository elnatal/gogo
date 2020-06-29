const requests = {};

const addRequest = ({newRequest}) => {
    var existingUser = null;
    if (requests[newRequest.passengerId]) {
        existingUser = requests[newRequest.passengerId].find((request) => request.driverId == newRequest.driverId);
    }
    if (existingUser) {
        return existingUser;
    } else {
        if (requests[newRequest.passengerId]) {
            requests[newRequest.passengerId].push(newRequest);
        } else {
            requests[newRequest.passengerId] = [];
            requests[newRequest.passengerId].push(newRequest)
        }
        return newRequest;
    }
}

const removeRequest = ({ passengerId, driverId }) => {
    if (requests[passengerId]) {
        const index = requests[passengerId].findIndex((request) => request.driverId == driverId);

        if (index != -1) {
            requests[passengerId].splice(index, 1);
        }
    }
}

const getRequest = ({ passengerId, driverId }) => requests[passengerId] ? requests[passengerId].find((request) => request.driverId == driverId) : null;

module.exports = { addRequest, removeRequest, getRequest };