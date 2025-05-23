const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const vehicleSchema = Schema({
    modelName: {
        type: String,
        required: false
    },
    modelYear: {
        type: String,
        required: false
    },
    plateNumber: {
        type: String,
        required: true
    },
    photo: {
        type: String,
        required: false
    },
    color: {
        type: String,
        required: false
    },
    insurance: {
        type: String,
        required: false
    },
    libre: {
        type: String,
        required: false
    },
    vehicleType: {
        type: Schema.Types.ObjectId,
        ref: 'VehicleTypes',
        required: true
    },
    driver: {
        type: Schema.Types.ObjectId,
        ref: 'Drivers',
        required: true
    },
    online: {
        type: Boolean,
        default: false
    },
    position: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // longitude comes first
      }
    },
    lastTripTimestamp: Date,
    timestamp: {
        type: Date,
        required: false
    },
    fcm: {
        type: String,
        required: false
    },
    active: {
        type: Boolean,
        default: true
    }
},
{
 timestamps: true
});

vehicleSchema.index({ active: 1, online: 1, position: "2dsphere"});

module.exports = mongoose.model('Vehicles', vehicleSchema);