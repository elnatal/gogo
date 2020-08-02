const Setting = require('../models/Setting');
const VehicleType = require('../models/VehicleType');
const Driver = require('../models/Driver');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const { default: Axios } = require('axios');

const getSettingsAndVehicleModels = async (req, res) => {
    Promise.all([
        Setting.findOne({}),
        VehicleType.find({ active: true }).sort({ createdAt: 'desc' })
    ]).then(value => {
        res.json({
            setting: value[0],
            vehicleTypes: value[1],
        });
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
    });
};

const route = (req, res) => {
    try {
        console.log("req", req.body)
        console.log("type", typeof (req.body))
        if (req && req.body && req.body.dropOffAddress && req.body.pickUpAddress) {
            Axios.get('https://api.mapbox.com/directions/v5/mapbox/driving/' + req.body.pickUpAddress.long + ',' + req.body.pickUpAddress.lat + ';' + req.body.dropOffAddress.long + ',' + req.body.dropOffAddress.lat + '?radiuses=unlimited;&geometries=geojson&access_token=pk.eyJ1IjoidGluc2FlLXliIiwiYSI6ImNrYnFpdnNhajJuNTcydHBqaTA0NmMyazAifQ.25xYVe5Wb3-jiXpPD_8oug').then((route) => {
                if (route && route.data && route.data.routes && route.data.routes[0] && route.data.routes[0].geometry && route.data.routes[0].geometry.coordinates) {
                    res.send({ coordinates: route.data.routes[0].geometry.coordinates, distance: route.data.routes[0].distance, duration: route.data.routes[0].duration });
                } else {
                    res.sendStatus(500);
                }
            }).catch(err => {
                res.sendStatus(500);
                console.log(err);
            });
        } else {
            res.status(500).send("invalid data");
        }
    } catch (error) {
        console.log(error);
    }
};

module.exports = { getSettingsAndVehicleModels, dashboard, route};