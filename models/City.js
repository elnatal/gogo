const mongoose = require('mongoose');

const citySchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    }
},
{
 timestamps: true
})

module.exports = mongoose.model('Cities', citySchema);