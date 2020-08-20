const Notification = require("../models/Notification");

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var notifications = Notification.find();
        if (req.query.page && parseInt(req.query.page) != 0) {
            page = parseInt(req.query.page);
        }
        if (req.query.limit) {
            limit = parseInt(req.query.limit);
        }

        if (page > 1) {
            prevPage = page - 1;
        }

        skip = (page - 1) * limit;

        notifications.sort({ createdAt: 'desc' });
        notifications.limit(limit);
        notifications.skip(skip);
        Promise.all([
            Notification.estimatedDocumentCount(),
            notifications.exec()
        ]).then(async (value) => {
            if (value) {
                if (((page * limit) <= value[0])) {
                    nextPage = page + 1;
                }

                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        });
    } catch (error) {
        res.send(error);
    };
}

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

module.exports = { sendByToken, sendByTopic, index};