const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SOSSchema = Schema({
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
      timestamp: Date
})