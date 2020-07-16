const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const VehicleType = require('../models/VehicleType');

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
        var vehicleTypes = await VehicleType.find({active: true});
        vehicleTypes && vehicleTypes.length ? responseData.vehicleTypes = vehicleTypes : console.log("can not find vehicle types");
    } catch (error) {
        responseData.vehicleTypes = [];
        console.log(error);
    }

    res.send(responseData);
});

module.exports = router;