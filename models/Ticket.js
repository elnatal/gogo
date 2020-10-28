const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketSchema = Schema({
    corporate: {
        type: Schema.Types.ObjectId,
        ref: 'Corporates',
        required: true
    },
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'Employees',
        required: true
    },
    ride: {
        type: Schema.Types.ObjectId,
        ref: 'Rides'
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
    },
    timestamp: Date
},
{
    timestamps: true
});

module.exports = mongoose.model("Tickets", TicketSchema);