const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const VehicleType = require('../models/VehicleType');
const Driver = require('../models/Driver');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');

router.get('/getSettingsAndVehicleModels', async (req, res) => {
    Promise.all([
        Setting.findOne({}),
        VehicleType.find({ active: true })
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
        Ride.countDocuments({ "status": "Running" }),
        Ride.countDocuments({ "status": "Completed" }),
    ]).then(value => {
        res.json({
            totalDrivers: value[0],
            totalUsers: value[1],
            totalVehicleTypes: value[2],
            totalActiveFleets: value[3],
            totalTrips: value[4],
            numberOfApprovedDriver: value[5],
            totalCanceledTrips: value[6],
            totalRunningTrips: value[7],
            totalCompletedTrps: value[8],
            revenue: 0,
        });
    });
});

module.exports = router;