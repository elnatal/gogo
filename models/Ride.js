const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RideSchema = Schema({
    schedule: Date,
    type: {
        type: String,
        default: "normal"
    },
    passenger: {
        type: Schema.Types.ObjectId,
        ref: "Users"
    },
    driver: {
        type: Schema.Types.ObjectId,
        ref: "Drivers"
    },
    dispatcher: {
        type: Schema.Types.ObjectId,
        ref: "accounts"
    },
    pickupTimestamp: Date,
    cancelCost: {
        type: Number,
        default: 0
    },
    endTimestamp: Date,
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
    dropOffAddress: {
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
    vehicleType: {
        type: Schema.Types.ObjectId,
        ref: "VehicleTypes",
        required: true
    },
    vehicle: {
        type: Schema.Types.ObjectId,
        ref: "Vehicles",
        required: true
    },
    cancelledBy: String,
    cancelledReason: String,
    totalDistance: Number,
    companyCut: {
        type: Number,
        default: 0
    },
    fare: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    route: {
        coordinates: {
            type: [[Number]]
        },
        distance: Number,
        duration: Number
    },
    discount: {
        type: Number,
        default: 0
    },
    paymentMethod: String,
    paymentStatus: String,
    status: String,
    active: {
        type: Boolean,
        required: true,
        default: true
    },
    driverRate: Number,
    driverComment: String,
    passengerRate: Number,
    passengerComment: String,
    payedToDriver: {
        type: Number,
        default: 0
    },
    net: {
        type: Number,
        default: 0
    },
    collectFromDriver: {
        type: Number,
        default: 0
    },
    corporate: Boolean,
    ticket: {
        type: Schema.Types.ObjectId,
        ref: "Tickets"
    },
    note: String,
    corporate: {
        type: Schema.Types.ObjectId,
        ref: "Corporates"
    },
    transactionNumber: Number,
    bidAmount: Number,
    createdBy: String,
},
{
 timestamps: true
});

module.exports = mongoose.model("Rides", RideSchema);