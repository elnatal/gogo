const { default: axios } = require('axios');
const logger = require('./logger');
require('dotenv/config');

const sendNotification = (to, message) => {
    // TODO:: Implement Push notification
    var data = { 
        "notification": { 
            "title": message && message.title ? message.title : "title",
            "body": message && message.body ? message.body : "body"
        }, 
        "priority": "high", 
        "data": { 
            "click_action": "FLUTTER_NOTIFICATION_CLICK", 
            "id": "1", 
            "status": "done" 
        }, 
        "to": to
    };

    var config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + process.env.FCM_TOKEN
        }
    };

    axios.post("https://fcm.googleapis.com/fcm/send", data, config).catch((error) => {
        logger.error("Notification service => " + error.toString());
    }).then((res) => {
        logger.info("Notification => " + res.status);
    });
    logger.info("Notification => to: " + to + ", message: " + message);
}

module.exports = { sendNotification };