const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WalletHistorySchema = Schema({
    driver: {
        type: Schema.Types.ObjectId,
        ref: "Drivers",
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    reason: String,
    account: {
        type: Schema.Types.ObjectId,
        ref: 'accounts'
    },
    by: {
        type: String,
        required: true
    }
},
{
    timestamps: true
}
);

module.exports = mongoose.model("WalletHistories", WalletHistorySchema);