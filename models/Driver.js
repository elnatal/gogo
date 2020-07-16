const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DriverSchema = Schema({
    firebaseId: {
        type: String,
        required: true
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
        required: true
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
    vehicle: {
        type: Schema.Types.ObjectId,
        ref: 'Vehicles'
    },
    active: {
        type: Boolean,
        default: true
    },
});

module.exports = mongoose.model('Drivers', DriverSchema);