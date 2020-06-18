const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VehicleTypeSchema = Schema({
    name: {
        type: String,
        required: true
    },
    status: {
        type: Boolean,
        required: true
    },
    city: {
        type: Schema.Types.ObjectId,
        ref: "Cities"
    },
    pricePerKM: {
        type: Number,
        required: true
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
    rentPerHourCost: {
        type: Number,
        required: true
    },
    rentPerDayCost: {
        type: Number,
        required: true
    },
    rentPerMonthCost: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model("VehicleTypes", VehicleTypeSchema);