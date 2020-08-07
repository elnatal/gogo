const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    profileImage: {
        type: String,
        required: false
    },
    emergencyContactNumber: {
        type: String,
        required: false
    },
    rating: {
        type: Number,
        default: 0.0
    },
    favoritePlaces: [
        {
            type: Schema.Types.ObjectId,
            ref: "FavoritePlaces"
        }
    ]
},
{
 timestamps: true
});

module.exports = mongoose.model('Users', userSchema);