const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SettingSchema = Schema({
    logo: String,
    favIcon: String,
    playStoreLink: String,
    appStoreLink: String,
    requestTimeout: {
        type: Number,
        default: 25
    },
    waitingTime: {
        type: Number,
        default: 25
    },
    searchRadius: Number,
    tax: {
        type: Number,
        default: 15
    },
    defaultCommission: {
        type: Number,
        default: 15
    },
    cancelCost: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
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
},
{
 timestamps: true
});

module.exports = mongoose.model("Setting", SettingSchema);