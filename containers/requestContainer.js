const { request } = require("express");

const requests = [];

const addRequest = ({ newRequest }) => {
    const existing = requests.find((request) => request.driverId == newRequest.driverId && request.passengerId == newRequest.passengerId);
    if (existing) {
        removeRequest({ passengerId: newRequest.passengerId, driverId: newRequest.driverId });
    }
    requests.push(newRequest);
}

const removeRequest = ({ passengerId, driverId }) => {
    const index = requests.findIndex((request) => request.driverId == driverId && request.passengerId == passengerId);

    if (index != -1) {
        requests.splice(index, 1);
    }
}

const updateRequest = ({ passengerId, driverId, status }) => {
    var request = getRequest({ passengerId, driverId });

    if (request) {
        request.updateStatus(request);
        removeRequest({ passengerId, driverId });
    }
}

const getRequest = ({ passengerId, driverId }) => requests.find((request) => request.driverId == driverId && request.passengerId == passengerId);

module.exports = { addRequest, removeRequest, getRequest, updateRequest };