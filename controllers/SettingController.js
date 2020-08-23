const Setting = require('../models/Setting');

const get = async (req, res) => {
    try {
        var setting = await Setting.findOne({});
        res.send(setting ? setting : {});
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
};

const add = async (req, res) => {
    var setting = null;
    try {
        setting = await Setting.findOne({});
    } catch (error) {
        console.log(error);
    }

    if (setting) {
        try {
            const updatedSetting = await Setting.updateOne({ '_id': setting._id }, req.body);
            res.send(updatedSetting);
        } catch (error) {
            console.log(error);
            res.status(500).send(error);
        }
    } else {
        try {
            const savedSetting = await Setting.create(req.body);
            res.send(savedSetting);
        } catch (error) {
            console.log(error);
            res.status(500).send(error);
        }
    }
};


module.exports = { get, add};