const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LoanSchema = Schema({
    from: {
        type: Schema.Types.ObjectId,
        ref: "Drivers",
        required: true
    },
    to: {
        type: Schema.Types.ObjectId,
        ref: "Drivers",
        required: true
    },
    paid: {
        type: Boolean,
        default: false
    },
    amount: {
        type: Number,
        required: true
    }
},
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Loans', LoanSchema);