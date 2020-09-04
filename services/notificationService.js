const { default: axios } = require('axios');
const logger = require('./logger');

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
            'Authorization': 'Bearer AAAA2RqOe68:APA91bGqYlyMNx1shAiUUojjxGyiDVw43ydmH5RAxmKFG9qAEbUJw4ZYC0T-R87Q_h97OjRL1HAP7-escboSlho0blEKfhA0AarCzN3wiyjRTpcmTqUuNkwrbhWQ4jmPzguO2ZvOguA9'
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