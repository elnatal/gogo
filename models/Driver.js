const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DriverSchema = Schema({
    firebaseId: {
        type: String,
        required: false
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false
    },
    businessLicense: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    profileImage: {
        type: String,
        required: true
    },
    representationPaper: {
        type: String,
        required: false
    },
    drivingLicense: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        default: 5.0
    },
    active: {
        type: Boolean,
        default: true
    },
    approved: {
        type: Boolean,
        default: false
    },
},
{
 timestamps: true
});

module.exports = mongoose.model('Drivers', DriverSchema);