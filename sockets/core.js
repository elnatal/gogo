const Vehicle = require('../models/Vehicle');

function getNearbyDrivers({location, distance}) {
    return new Promise((resolve, reject) => {
        if (distance && location) {
            Vehicle.find({
                online: true,
                position: {
                    $near: {
                        $maxDistance: distance,
                        $geometry: {
                            type: "Point",
                            coordinates: [location.lat, location.long]
                        }
                    }
                }
            }, 'position vehicleType').find((err, res) => {
                if(err) return err;
                if(res) {
                    let drivers = JSON.stringify(res);
                    return resolve(drivers);
                }
            })
        } else {
            return reject("Invalid location or distance");
        }
    })
}

function search({pickupLocation, dropOffLocation, userId}) {
    var requestedDrivers = [];
    var drivers = [];

    var interval = setInterval(async () => {
        drivers = await getNearbyDrivers(pickupLocation, 1000);
        if (drivers.length) {
            try {
                var drivers = await getNearbyDrivers({ location, distance: 1000 });
                socket.emit('nearDrivers', drivers);
            } catch (err) {
                console.log(err);
            }
            setInterval()
        } else {
            clearInterval(interval);
        }
    }, 5000)
}

module.exports = {getNearbyDrivers, search};