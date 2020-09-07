const WalletHistory = require("../models/WalletHistory");
const logger = require("../services/logger");

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;
        var filter = {};

        if (req.query.driver != null && req.query.driver != 'all') {
            filter['driver'] = req.query.driver;
        }

        if (req.query.account != null && req.query.account != 'all') {
            filter['account'] = req.query.account;
        }

        if (req.query.by != null && req.query.by != 'all') {
            filter['by'] = req.query.by;
        }

        if (req.query.start != null && req.query.start != 'all' && req.query.end != null && req.query.end != 'all') {
            filter['$and'] = [{"createdAt" : { $gte: new Date(req.query.start) }}, {"createdAt": { $lte: new Date(req.query.end) }}];
        } else if (req.query.end != null && req.query.end != 'all') {
            filter['createdAt'] = { $lte: new Date(req.query.end) };
        } else if (req.query.start != null && req.query.start != 'all') {
            filter['createdAt'] = { $gte: new Date(req.query.start) };
        }

        var walletHistories = WalletHistory.find(filter);
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

        walletHistories.sort({ createdAt: 'desc' });
        walletHistories.limit(limit);
        walletHistories.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                walletHistories.populate(e);
            });
        }
        Promise.all([
            WalletHistory.estimatedDocumentCount(),
            walletHistories.exec()
        ]).then((value) => {
            if (value) {
                if (((page * limit) <= value[0])) {
                    nextPage = page + 1;
                }

                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        }).catch((error) => {
            logger.error("Wallet history => " + error.toString());
            res.status(500).send(error);
        });
    } catch (error) {
        logger.error("Wallet history => " + error.toString());
        res.status(500).send(error);
    };
}

module.exports = { index };