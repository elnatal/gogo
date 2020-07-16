const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const vehicleSchema = Schema({
    modelName: {
        type: String,
        required: true
    },
    modelYear: {
        type: String,
        required: true
    },
    plateNumber: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    insurance: {
        type: String,
        required: true
    },
    libre: {
        type: String,
        required: true
    },
    vehicleType: {
        type: Schema.Types.ObjectId,
        ref: 'VehicleTypes',
        required: true
    },
    online: {
        type: Boolean,
        default: false
    },
    position: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: {
        type: [Number], // longitude comes first
      }
    },
    vehicleType: {
        type: Schema.Types.ObjectId,
        ref: 'Drivers',
        required: true
    },
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

vehicleSchema.index({online: 1, position: "2dsphere"});

module.exports = mongoose.model('Vehicles', vehicleSchema);