const Setting = require('../models/Setting');
const logger = require('../services/logger');

const get = async (req, res) => {
    try {
        var setting = await Setting.findOne({});
        res.send(setting ? setting : {});
    } catch (error) {
        logger.error("Setting => " + error.toString());
        res.status(500).send(error);
    }
};

const add = async (req, res) => {
    var setting = null;
    try {
        setting = await Setting.findOne({});
    } catch (error) {
        logger.error("Setting => " + error.toString());
    }

    if (setting) {
        try {
            const updatedSetting = await Setting.updateOne({ '_id': setting._id }, req.body);
            res.send(updatedSetting);
        } catch (error) {
            logger.error("Setting => " + error.toString());
            res.status(500).send(error);
        }
    } else {
        try {
            const savedSetting = await Setting.create(req.body);
            res.send(savedSetting);
        } catch (error) {
            logger.error("Setting => " + error.toString());
            res.status(500).send(error);
        }
    }
};


module.exports = { get, add};