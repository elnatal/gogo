const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CorporateSchema = Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    shortName: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
    },
    active: {
        type: Boolean,
        default: true
    }
},
{
 timestamps: true
});

module.exports = mongoose.model("Corporates", CorporateSchema);