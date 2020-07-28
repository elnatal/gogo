const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const VehicleType = require('../models/VehicleType');
const Driver = require('../models/Driver');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const { route } = require('./drivers');
const { default: Axios } = require('axios');

router.get('/getSettingsAndVehicleModels', async (req, res) => {
    Promise.all([
        Setting.findOne({}),
        VehicleType.find({ active: true }).sort({ createdAt: 'desc' })
    ]).then(value => {
        res.json({
            setting: value[0],
            vehicleTypes: value[1],
        });
    });
});

router.get('/dashboard', async (req, res) => {

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
});

router.post('/route', (req, res) => {
    try {
        console.log("req", req.body)
        console.log("type", typeof (req.body))
        if (req && req.body && req.body.dropOffLocation && req.body.pickupLocation) {
            Axios.get('https://api.mapbox.com/directions/v5/mapbox/driving/' + req.body.pickupLocation.long + ',' + req.body.pickupLocation.lat + ';' + req.body.dropOffLocation.long + ',' + req.body.dropOffLocation.lat + '?radiuses=unlimited;&geometries=geojson&access_token=pk.eyJ1IjoidGluc2FlLXliIiwiYSI6ImNrYnFpdnNhajJuNTcydHBqaTA0NmMyazAifQ.25xYVe5Wb3-jiXpPD_8oug').then((route) => {
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
})

module.exports = router;