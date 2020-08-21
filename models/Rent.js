const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RentSchema = Schema({
    passenger: {
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    driver: {
        type: Schema.Types.ObjectId,
        ref: 'Drivers'
    },
    startTimestamp: Date,
    endTimestamp: Date,
    status: String
})

module.exports = mongoose.model("Rents", RentSchema);