const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CorporatePaymentSchema = Schema({
    corporate: {
        type: Schema.Types.ObjectId,
        ref: "Corporates",
        required: true
    },
    startTimestamp: {
        type: Date,
        required: true
    },
    endTimestamp: {
        type: Date,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    month: {
        type: String,
        required: true
    }
},
    {
        timestamps: true
    }
)

module.exports = mongoose.model("CorporatePayments", CorporatePaymentSchema);