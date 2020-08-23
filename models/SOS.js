const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SOSSchema = Schema({
  driver: {
    type: Schema.Types.ObjectId,
    ref: "Drivers"
  },
  passenger: {
    type: Schema.Types.ObjectId,
    ref: "Drivers"
  },
  vehicle: {
    type: Schema.Types.ObjectId,
    ref: "Drivers"
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
  }
},
  {
    timestamps: true
  })

module.exports = mongoose.model("SOS", SOSSchema);