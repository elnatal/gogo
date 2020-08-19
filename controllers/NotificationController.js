const { sendNotification } = require("../services/notificationService");

const sendByToken = (req, res) => {
    if (req.params.token && req.body && req.body.title && req.body.body) {
        sendNotification(req.params.token, req.body);
        res.send("Notification sent")
    } else {
        res.status(500).send("Invalid data");
    }
}

const sendByTopic = (req, res) => {
    if (req.params.topic && req.body && req.body.title && req.body.body) {
        sendNotification('/topics/' + req.params.topic, req.body);
        res.send("Notification sent")
    } else {
        res.status(500).send("Invalid data");
    }
}

module.exports = { sendByToken, sendByTopic};