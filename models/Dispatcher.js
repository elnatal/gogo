const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DispatcherSchema = Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: false
    },
    roles: {
        type: [Number],
        required: true,
        default: []
    },
    profileImage: {
        type: String,
        required: false
    },
    active: {
        type: Boolean,
        default: true
    },
},
{
 timestamps: true
});

module.exports = mongoose.model('Dispatchers', DispatcherSchema);