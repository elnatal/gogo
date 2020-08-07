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
    active: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model("Tickets", TicketSchema);