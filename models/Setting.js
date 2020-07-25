const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SettingSchema = Schema({
    logo: String,
    favIcon: String,
    playStoreLink: String,
    appStoreLink: String,
    requestTimeout: Number,
    searchRadius: Number,
    tax: Number,
    defaultCommission: Number,
    cancelCost: Number,
    discount: Number,
    contactNumber: String,
    contactEmail: String,
    facebookLink: String,
    googleLink: String,
    twitterLink: String,
    mapKey: String,
    creditAllowance: Number,
    mediumWorkerAverageTrip: Number,
    hardWorkerAverageTrip: Number,
    localization: {
        type: Object
    }
});

module.exports = mongoose.model("Setting", SettingSchema);