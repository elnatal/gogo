const Setting = require('../models/Setting');
const VehicleType = require('../models/VehicleType');
const Driver = require('../models/Driver');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const { default: Axios } = require('axios');
const Rent = require('../models/Rent');
const logger = require('../services/logger');

const getSettingsAndVehicleModels = async (req, res) => {
    Promise.all([
        Setting.findOne({}),
        VehicleType.find({ active: true }).sort({ createdAt: 'desc' })
    ]).then(value => {
        res.json({
            setting: value[0],
            vehicleTypes: value[1],
        });
    }).catch((error) => {
        logger.error("Core => " + error.toString());
        res.status(500).send(error);
    });
};

const dashboard = async (req, res) => {

    Promise.all([
        Driver.countDocuments(),
        User.countDocuments(),
        VehicleType.countDocuments(),
        Vehicle.countDocuments({ "online": true }),
        Ride.countDocuments(),
        Driver.countDocuments({ "approved": true }),
        Ride.countDocuments({ "status": "Canceled" }),
        Ride.countDocuments({ "status": "Completed" }),
        Ride.countDocuments({ "status": "Accepted" }),
        Ride.countDocuments({ "status": "Arrived" }),
        Ride.countDocuments({ "status": "Started" }),
    ]).then(value => {
        res.json({
            totalDrivers: value[0],
            totalUsers: value[1],
            totalVehicleTypes: value[2],
            totalActiveFleets: value[3],
            totalTrips: value[4],
            numberOfApprovedDriver: value[5],
            totalCanceledTrips: value[6],
            totalCompletedTrips: value[7],
            totalRunningTrips: value[8] + value[9] + value[10],
            revenue: 0,
        });
    }).catch((error) => {
        logger.error("Core => " + error.toString());
        res.status(500).send(error);
    });
};

const route = (req, res) => {
    try {
        if (req && req.body && req.body.dropOffAddress && req.body.pickUpAddress) {
            Axios.get('https://api.mapbox.com/directions/v5/mapbox/driving/' + req.body.pickUpAddress.long + ',' + req.body.pickUpAddress.lat + ';' + req.body.dropOffAddress.long + ',' + req.body.dropOffAddress.lat + '?radiuses=unlimited;&geometries=geojson&access_token=pk.eyJ1IjoidGluc2FlLXliIiwiYSI6ImNrYnFpdnNhajJuNTcydHBqaTA0NmMyazAifQ.25xYVe5Wb3-jiXpPD_8oug').then((route) => {
                if (route && route.data && route.data.routes && route.data.routes[0] && route.data.routes[0].geometry && route.data.routes[0].geometry.coordinates) {
                    res.send({ coordinates: route.data.routes[0].geometry.coordinates, distance: route.data.routes[0].distance, duration: route.data.routes[0].duration });
                } else {
                    res.sendStatus(500);
                }
            }).catch(error => {
                logger.error("Core => " + error.toString());
                res.status(500).send(error);
            });
        } else {
            res.status(500).send("invalid data");
        }
    } catch (error) {
        logger.error("Core => " + error.toString());
        res.status(500).send(error);
    }
};

const godview = async (req, res) => {
    try {
        var vehicles = await Vehicle.find({}).populate('driver');
        res.send(vehicles);
    } catch (error) {
        res.status(500).send(error);
        logger.error("Core => " + error.toString());
    }
}

const finance = (req, res) => {
    try {
        var filter = {};

        var normalTripsFare = 0;
        var corporateTripsFare = 0;
        var normalTripsNet = 0;
        var corporateTripsNet = 0;
        var normalTripsTax = 0;
        var corporateTripsTax = 0;

        var rentFare = 0;
        var rentNet = 0;
        var rentTax = 0;

        if (req.query.start != null && req.query.end != null) {
            filter['$and'] = [{ "pickupTimestamp": { $gte: new Date(req.query.start) } }, { "pickupTimestamp": { $lte: new Date(req.query.end) } }];
        } else if (req.query.end != null && req.query.end != 'all') {
            filter['pickupTimestamp'] = { $lte: new Date(req.query.end) };
        } else if (req.query.start != null && req.query.start != 'all') {
            filter['pickupTimestamp'] = { $gte: new Date(req.query.start) };
        }

        if (req.query.driver != null && req.query.driver != 'all') {
            filter['driver'] = req.query.driver;
        }

        Promise.all([
            Ride.find(filter),
            Rent.find(filter)
        ]).then((value) => {
            if (value[0]) {
                value[0].forEach((ride) => {
                    if (ride.type == "corporate") {
                        corporateTripsFare += ride.fare;
                        corporateTripsNet += ride.net;
                        corporateTripsTax += ride.tax;
                    } else {
                        normalTripsFare += ride.fare;
                        normalTripsNet += ride.net;
                        normalTripsTax += ride.tax;
                    }
                });
            }

            if (value[1]) {
                value[1].forEach((rent) => {
                    rentFare += rent.fare;
                    rentNet += rent.net;
                    rentTax += rent.tax;
                });
            }

            res.send({ 
                normalTripsFare, 
                normalTripsNet, 
                normalTripsTax, 
                corporateTripsFare, 
                corporateTripsNet, 
                corporateTripsTax,
                rentFare,
                rentNet,
                rentTax
            });
        }).catch((error) => {
            res.status(500).send(error);
            logger.error("Core => " + error.toString());
        })
    } catch (error) {
        res.status(500).send(error);
        logger.error("Core => " + error.toString());
    }
}

const date = (req, res) => {
    res.send(new Date());
}

module.exports = { getSettingsAndVehicleModels, dashboard, route, godview, finance, date };