const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TokenSchema = Schema({
    active: {
        type: Boolean,
        default: true
    },
    role: {
        type: Number,
        require: true
    },
    ttl: {
        type: Number,
        default: new Date().getTime() + (24 * 60 * 60 * 1000)
    }
},
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Tokens', TokenSchema);