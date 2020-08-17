const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AccountSchema = Schema({
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
    corporate: {
        type: Schema.Types.ObjectId,
        ref: 'Corporates',
        required: false
    }
},
{
 timestamps: true
});

module.exports = mongoose.model('accounts', AccountSchema);