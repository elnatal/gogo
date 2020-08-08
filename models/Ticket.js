const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketSchema = Schema({
    employeeName: {
        type: String,
        required: true
    },
    corporate: {
        type: Schema.Types.ObjectId,
        ref: 'Corporates',
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        default: 0
    },
    active: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model("Tickets", TicketSchema);