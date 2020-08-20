const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = Schema(
    {
        title: {
            type: String,
            required: true
        },
        body: {
            type: String,
            required: true
        },
        to: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Notifications', NotificationSchema);