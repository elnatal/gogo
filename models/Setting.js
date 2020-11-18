const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SettingSchema = Schema({
    logo: String,
    favIcon: String,
    driverAppstoreLink: String,
    driverPlaystoreLink: String,
    passengerAppstoreLink: String,
    passengerPlaystoreLink: String,
    requestTimeout: {
        type: Number,
        default: 25
    },
    waitingTime: {
        type: Number,
        default: 25
    },
    searchRadius: {
        type: Number,
        default: 3
    },
    rentSearchRadius: {
        type: Number,
        default: 3
    },
    scheduleSearchRadius: {
        type: Number,
        default: 3
    },
    sosDayLimit: {
        type: Number,
        default: 1
    },
    androidDriverVersion: {
        type: String,
        default: '0.0.1'
    },
    androidPassengerVersion: {
        type: String,
        default: '0.0.1'
    },
    iosDriverVersion: {
        type: String,
        default: '0.0.1'
    },
    iosPassengerVersion: {
        type: String,
        default: '0.0.1'
    },
    leastAndroidDriverVersion: {
        type: String,
        default: '0.0.1'
    },
    leastAndroidPassengerVersion: {
        type: String,
        default: '0.0.1'
    },
    leastIosDriverVersion: {
        type: String,
        default: '0.0.1'
    },
    leastIosPassengerVersion: {
        type: String,
        default: '0.0.1'
    },
    bidDriversPerRequest: {
        type: Number,
        default: 1
    },
    tax: {
        type: Number,
        default: 15
    },
    defaultCommission: {
        type: Number,
        default: 15
    },
    rentCommission: {
        type: Number,
        default: 15
    },
    defaultRoadPickupCommission: {
        type: Number,
        default: 5
    },
    cancelCost: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    promoAmount: {
        type: Number,
        default: 0
    },
    promoRate: {
        type: Number,
        default: 0
    },
    promoTripCount: {
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