const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WalletRecordSchema = Schema({
    amount: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now()
    },
    topupper: {
        type: Schema.Types.ObjectId
    }
},
{
 timestamps: true
})