const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const VehicleType = require('../models/VehicleType');
const Driver = require('../models/Driver');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');

router.get('/getSettingsAndVehicleModels', async (req, res) => {
    const responseData = {
        setting: {},
        vehicleTypes: []
    };

    try {
        var setting = await Setting.findOne({});
        setting ? responseData.setting = setting : console.log("Can not find settings");
    } catch (error) {
        responseData.setting = {};
        console.log(error);
    }

    try {
        var vehicleTypes = await VehicleType.find({ active: true });
        vehicleTypes && vehicleTypes.length ? responseData.vehicleTypes = vehicleTypes : console.log("can not find vehicle types");
    } catch (error) {
        responseData.vehicleTypes = [];
        console.log(error);
    }

    res.send(responseData);
});

router.get('/dashboard', async (req, res) => {
    const data = {
        totalDrivers: 0,
        totalUsers: 0,
        totalVehicleTypes: 0,
        totalActiveFleets: 0,
        revenue: 0,
        totalTrips: 0,
        numberOfApprovedDriver: 0,
        totalCanceledTrips: 0,
        totalRunningTrips: 0,
        totalCompletedTrps: 0
    };

    Promise.all([
        Promise.resolve(Driver.countDocuments()),
        Promise.resolve(User.countDocuments()),
        Promise.resolve(VehicleType.countDocuments()),
        Promise.resolve(Vehicle.countDocuments({ "online": true })),
        Promise.resolve(Ride.countDocuments()),
        Promise.resolve(Driver.countDocuments({ "approved": true })),
        Promise.resolve(Ride.countDocuments({ "status": "Canceled" })),
        Promise.resolve(Ride.countDocuments({ "status": "Running" })),
        Promise.resolve(Ride.countDocuments({ "status": "Completed" })),
    ]).then(value => {
        data.totalDrivers = value[0];
        data.totalUsers = value[1];
        data.totalVehicleTypes = value[2];
        data.totalActiveFleets = value[3];
        data.totalTrips = value[4];
        data.numberOfApprovedDriver = value[5];
        data.totalCanceledTrips = value[6];
        data.totalRunningTrips = value[7];
        data.totalCompletedTrps = value[8];

        res.send(data);
    });
});

module.exports = router;