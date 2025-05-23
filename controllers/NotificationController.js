const Notification = require("../models/Notification");
const { sendNotification } = require("../services/notificationService");
const logger = require("../services/logger");

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage; 
        var filter = {
            $or: [
                {
                    title: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }, {
                    body: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }
            ]
        };

        if (req.query.to != null) {
            filter['to'] = req.query.to;
        }

        var notifications = Notification.find(filter);
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
            Notification.countDocuments(filter),
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

const search = (req, res) => {
    try {
        var filter = {
            title: {
                $regex: req.query.q ? req.query.q : "", $options: "i"
            }
        };

        if (req.query.to != null) {
            filter['to'] = req.query.to;
        }

        Notification.find(filter, (error, notifications) => {
            if (error) {
                logger.error("Notification => " + error.toString());
                res.status(500).send(error);
            }

            if (notifications) {
                res.send(notifications);
            }
        }).limit(10);
    } catch (error) {
        logger.error("Notification => " + error.toString());
        res.status(500).send(error);
    }
}

const sendByToken = (req, res) => {
    try {
        if (req.params.token && req.body && req.body.title && req.body.body) {
            Notification.create({title: req.body.title, body: req.body.body, to: req.params.token, type: "token"}, (error, notification) => {
                if (error) {
                    logger.error("Notification => " + error.toString());
                    res.status(500).send(error);
                }
                if (notification) {
                    sendNotification(req.params.token, req.body);
                    res.send("Notification sent");
                }
            })
        } else {
            res.status(500).send("Invalid data");
        }
    } catch (error) {
        logger.error("Notification => " + error.toString());
        res.status(500).send(error);
    }
}

const sendByTopic = (req, res) => {
    try {
        if (req.params.topic && req.body && req.body.title && req.body.body) {
            Notification.create({title: req.body.title, body: req.body.body, to: req.params.topic, type: "topic"}, (error, notification) => {
                if (error) {
                    logger.error("Notification => " + error.toString());
                    res.status(500).send(error);
                }
                if (notification) {
                    sendNotification('/topics/' + req.params.topic, req.body);
                    res.send("Notification sent");
                }
            })
        } else {
            res.status(500).send("Invalid data");
        }
    } catch (error) {
        logger.error("Notification => " + error.toString());
        res.status(500).send(error);
    }
}

module.exports = { sendByToken, sendByTopic, index, search};