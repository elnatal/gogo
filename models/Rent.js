const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RentSchema = Schema({
    passenger: {
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    driver: {
        type: Schema.Types.ObjectId,
        ref: 'Drivers'
    },
    startTimestamp: Date,
    endTimestamp: Date,
    vehicleType: {
        type: Schema.Types.ObjectId,
        ref: "VehicleTypes"
    },
    note: String,
    cancelledBy: String,
    cancelledReason: String,
    pickUpAddress: {
        type: {
            name: String,
            coordinate: {
                type: {
                    lat: Number,
                    long: Number
                },
                required: true
            }
        },
        required: true
    },
    vehicle: {
        type: Schema.Types.ObjectId,
        ref: "Vehicles"
    },
    fare: {
        type: Number,
        default: 0
    },
    companyCut: {
        type: Number,
        default: 15
    },
    tax: {
        type: Number,
        default: 15
    },
    status: String,
    active: {
        type: Boolean,
        default: true
    }
},
    {
        timestamps: true
    }
)

module.exports = mongoose.model("Rents", RentSchema);