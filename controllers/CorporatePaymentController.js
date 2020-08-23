const CorporatePayment = require("../models/CorporatePayment");

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var corporatePayments = CorporatePayment.find();
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

        corporatePayments.sort({ createdAt: 'desc' });
        corporatePayments.limit(limit);
        corporatePayments.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                corporatePayments.populate(e);
            });
        }
        Promise.all([
            CorporatePayment.estimatedDocumentCount(),
            corporatePayments.exec()
        ]).then(async (value) => {
            if (value) {
                if (((page * limit) <= value[0])) {
                    nextPage = page + 1;
                }

                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        }).catch((error) => {
            console.log(error);
            res.status(500).send(error);
        });
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    };
}

module.exports = { index };