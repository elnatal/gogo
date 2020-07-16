const mongoose = require('mongoose');

const favoritePlacesSchema = mongoose.Schema({
    name: {
        type: String,
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
    }
})

module.exports = mongoose.model('FavoritePlaces', favoritePlacesSchema);