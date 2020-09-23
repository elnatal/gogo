const Loan = require("../models/Loan");
const logger = require("../services/logger");

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;
        var filter = {};

        if (req.query.from != null && req.query.from != 'all') {
            filter['from'] = req.query.from;
        }

        if (req.query.to != null && req.query.to != 'all') {
            filter['to'] = req.query.to;
        }

        if (req.query.paid != null && req.query.paid != 'all') {
            filter['paid'] = req.query.paid;
        }

        if (req.query.start != null && req.query.start != 'all' && req.query.end != null && req.query.end != 'all') {
            filter['$and'] = [{"createdAt" : { $gte: new Date(req.query.start) }}, {"createdAt": { $lte: new Date(req.query.end) }}];
        } else if (req.query.end != null && req.query.end != 'all') {
            filter['createdAt'] = { $lte: new Date(req.query.end) };
        } else if (req.query.start != null && req.query.start != 'all') {
            filter['createdAt'] = { $gte: new Date(req.query.start) };
        }

        var loanHistories = Loan.find(filter);
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

        loanHistories.sort({ createdAt: 'desc' });
        loanHistories.limit(limit);
        loanHistories.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                loanHistories.populate(e);
            });
        }
        Promise.all([
            Loan.countDocuments(filter),
            loanHistories.exec()
        ]).then((value) => {
            if (value) {
                if (((page * limit) <= value[0])) {
                    nextPage = page + 1;
                }

                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        }).catch((error) => {
            logger.error("Loan history => " + error.toString());
            res.status(500).send(error);
        });
    } catch (error) {
        logger.error("Loan history => " + error.toString());
        res.status(500).send(error);
    };
}

module.exports = { index };