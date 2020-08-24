const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VehicleTypeSchema = Schema({
    name: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
    city: {
        type: Schema.Types.ObjectId,
        ref: "Cities"
    },
    pricePerKM: {
        type: Number,
        required: true
    },
    photo: {
        type: String,
        required: true
    },
    numberOfSeats: {
        type: Number,
        required: true,
    },
    pricePerMin: {
        type: Number,
        required: true
    },
    surgePrice: {
        type: Number,
        required: true
    },
    baseFare: {
        type: Number,
        required: true
    },
    priceForMediumWorkers: {
        type: Number,
        required: true
    },
    priceForHardWorkers: {
        type: Number,
        required: true
    },
    rentPerHour: {
        type: Number,
        default: 0
    },
    rentPerDay: {
        type: Number,
        default: 0
    },
    rentDiscount: {
        type: Number,
        default: 0
    }
},
{
 timestamps: true
});

module.exports = mongoose.model("VehicleTypes", VehicleTypeSchema);