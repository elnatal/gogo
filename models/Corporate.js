const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CorporateSchema = Schema({
    name: {
        type: String,
        required: true
    },
    shortName: {
        type: String,
        required: true
    }
},
{
 timestamps: true
});

module.exports = mongoose.model("Corporates", CorporateSchema);