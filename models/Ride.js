const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RideSchema = Schema({
    schedule: Date,
    passenger: {
        type: Schema.Types.ObjectId,
        ref: "Users"
    },
    driver: {
        type: Schema.Types.ObjectId,
        ref: "Drivers"
    },
    pickupTimestamp: Date,
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
    fare: Number,
    tax: Number,
    route: {
        coordinates: {
            type: [[Number]]
        },
        distance: Number,
        duration: Number
    },
    discount: Number,
    totalAmount: Number,
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
    payedToDriver: Number,
    collectFromDriver: Number,
    corporate: Boolean,
    corporateTicket: {
        type: Schema.Types.ObjectId,
        ref: "Tickets"
    },
    transactionNumber: Number,
    bidNumber: Number,
    createdBy: String,
},
{
 timestamps: true
});

module.exports = mongoose.model("Rides", RideSchema);