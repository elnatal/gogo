const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LogSchema = Schema({
    timestamp: Date,
    level: String,
    message: String,
    meta: Object
});

module.exports = mongoose.model('logs', LogSchema);