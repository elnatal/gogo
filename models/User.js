const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    profileImage: {
        type: String,
        required: true
    },
    emergencyContactNumber: {
        type: String,
        required: false
    },
    favoritePlaces: [
        {
            type: Schema.Types.ObjectId,
            ref: "FavoritePlaces"
        }
    ]
});

module.exports = mongoose.model('Users', userSchema);