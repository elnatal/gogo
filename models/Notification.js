const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = Schema(
    {
        title: String,
        body: String,
        to: String
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Notifications', NotificationSchema);