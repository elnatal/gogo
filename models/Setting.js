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
    tax: Number,
    defaultCommission: Number,
    cancelCost: {
        type: Number,
        default: 0
    },
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
},
{
 timestamps: true
});

module.exports = mongoose.model("Setting", SettingSchema);