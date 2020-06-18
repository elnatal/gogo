const mongoose = require('mongoose');

const vehicleSchema = mongoose.Schema({
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
    vehicleTypeId: {
        type: String,
        required: true
    },
    online: {
        type: Boolean,
        required: true
    },
    position: {
      type: {
        type: String,
        enum: ['Point'],
        required: true
      },
      coordinates: {
        type: [Number], // longitude comes first
        required: true
      }
    },
    timeStamp: {
        type: Date,
        required: true
    },
    token: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        required: true
    }
},
{
 timestamps: true
});

vehicleSchema.index({position: "2dsphere"});

module.exports = mongoose.model('Vehicles', vehicleSchema);