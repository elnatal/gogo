const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TokenSchema = Schema({
    active: {
        type: Boolean,
        default: true
    },
    driver: {
        type: Schema.Types.ObjectId,
        ref: "Drivers" 
    },
    account: {
        type: Schema.Types.ObjectId,
        ref: "accounts" 
    }
},
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Tokens', TokenSchema);