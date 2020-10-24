var trips = {};

const addTrip = (trip) => {
    trips[trip._id] = trip;
}

const findTrip = (id) => {
    return trips[id];
}

const removeTrip = (id) => {
    delete trips[id];
}

module.exports = { addTrip, findTrip, removeTrip };