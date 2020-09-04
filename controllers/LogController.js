const Log = require("../models/Log");
const logger = require("../services/logger");

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;
        var filter = {}

        var logs = Log.find(filter);
        if (req.query.page && parseInt(req.query.page) != 0) {
            page = parseInt(req.query.page);
        }
        if (req.query.limit) {
            limit = parseInt(req.query.limit);
        }

        if (req.query.level) {
            filter["level"] = req.query.level;
        }

        if (page > 1) {
            prevPage = page - 1;
        }

        skip = (page - 1) * limit;

        logs.sort({ timestamp: 'desc' });
        logs.limit(limit);
        logs.skip(skip);
        Promise.all([
            Log.estimatedDocumentCount(),
            logs.exec()
        ]).then(async (value) => {
            if (value) {
                if (((page * limit) <= value[0])) {
                    nextPage = page + 1;
                }

                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        });
    } catch (error) {
        logger.error(error.toString());
        res.send(error);
    };
}

module.exports = { index };