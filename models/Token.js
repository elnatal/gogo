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
    dispatcher: {
        type: Schema.Types.ObjectId,
        ref: "Dispatchers" 
    },
    role: {
        type: Number,
        require: true
    }
},
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Tokens', TokenSchema);