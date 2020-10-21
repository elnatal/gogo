const Corporate = require('../models/Corporate');
const bcrypt = require('bcryptjs');
const Ticket = require('../models/Ticket');
const Ride = require('../models/Ride');
const Account = require('../models/Account');
const CorporatePayment = require('../models/CorporatePayment');
const logger = require('../services/logger');

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var filter = {};

        if (req.query.q != null) {
            filter['$or'] = [
                {
                    name: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }, {
                    shortName: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }
            ];
        }

        var corporates = Corporate.find(filter);
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

        corporates.sort({ createdAt: 'desc' });
        corporates.limit(limit);
        corporates.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                corporates.populate(e);
            });
        }
        Promise.all([
            Corporate.countDocuments(filter),
            corporates.exec()
        ]).then(async (value) => {
            if (value) {
                if (((page * limit) <= value[0])) {
                    nextPage = page + 1;
                }

                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        }).catch((error) => {
            logger.error("Corporate => " + error.toString());
            res.status(500).send(error);
        });
    } catch (error) {
        logger.error("Corporate => " + error.toString());
        res.status(500).send(error);
    };
}

const trips = async (req, res) => {
    try {
        var filter = {
            corporate: req.params.id
        };
        if (req.query.start || req.query.end) {
            filter["endTimestamp"] = {};
        }
        if (req.query.start) {
            filter.endTimestamp["$gte"] = req.query.start;
        }
        if (req.query.end) {
            filter.endTimestamp["$lte"] = req.query.end;
        }
        var rides = await Ride.find(filter);
        res.send(rides);
    } catch (error) {
        logger.error("Corporate => " + error.toString());
        res.status(500).send(error);
    }
}

const dashboard = async (req, res) => {
    const now = new Date();
    const start = now;
    const end = now;

    if (req.query.month) {
        start.setMonth(parseInt(req.query.month))
        end.setMonth(parseInt(req.query.month))
    }

    start.setDate(1);
    end.setDate(31);

    try {
        Promise.all([
            Ride.countDocuments({ "corporate": req.params.id }),
            Ride.where({
                corporate: req.params.id,
                endTimestamp: { $gte: start },
                endTimestamp: { $lte: end }
            }),
            Ticket.countDocuments({ "corporate": req.params.id })
        ]).then((value) => {
            if (value && value.length) {
                var total = 0;
                var totalTrips = 0;

                if (value[1] && value[1].length) {
                    value[1].forEach((trip) => {
                        if (trip.fare) {
                            totalTrips += 1;
                            total += trip.fare;
                        }
                    })
                }

                res.send({ totalTrips: value[0], monthlyTrip: totalTrips, tickets: value[2], monthlyCost: total });
            } else {
                res.status(500).send("Something went wrong!")
            }
        }).catch((error) => {
            logger.error("Corporate => " + error.toString());
            res.status(500).send(error);
        });
    } catch (error) {
        logger.error("Corporate => " + error.toString());
        res.status(500).send(error);
    }
};

const search = (req, res) => {
    try {
        Corporate.find({ name: { $regex: req.query.q ? req.query.q : "", $options: "i" } }, (error, corporates) => {
            if (error) {
                logger.error("Corporate => " + error.toString());
                res.status(500).send(error);
            }

            if (corporates) {
                res.send(corporates);
            }
        }).limit(10);
    } catch (error) {
        logger.error("Corporate => " + error.toString());
        res.status(500).send(error);
    }
}

const tickets = (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;
        var filter = {
            corporate: req.params.id
        };

        if (req.query.active != null && req.query.active != 'all') {
            filter['active'] = req.query.active;
        }

        if (req.query.locked != null && req.query.locked != 'all') {
            filter['locked'] = req.query.locked;
        }

        if (req.query.q != null) {
            filter['$or'] = [
                {
                    code: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }, {
                    employeeName: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }
            ];
        }

        var tickets = Ticket.find(filter);
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

        tickets.sort({ createdAt: 'desc' });
        tickets.limit(limit);
        tickets.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                tickets.populate(e);
            });
        }
        Promise.all([
            Ticket.countDocuments(filter),
            tickets.exec()
        ]).then(async (value) => {
            if (value) {
                if (((page * limit) <= value[0])) {
                    nextPage = page + 1;
                }

                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        }).catch((error) => {
            logger.error("Ticket => " + error.toString());
            res.status(500).send(error);
        });
    } catch (error) {
        logger.error("Corporate tickets => " + error.toString());
        res.status(500).send(error);
    }
}


const show = async (req, res) => {
    try {
        var corporate = await Corporate.findById(req.params.id);
        res.send(corporate);
    } catch (error) {
        logger.error("Corporate => " + error.toString());
        res.status(500).send(error);
    };
}

const store = async (req, res) => {
    try {
        const data = req.body;
        if (data.name && data.shortName) {
            Corporate.create({
                name: data.name,
                shortName: data.shortName
            }, (error, corporate) => {
                if (error) {
                    logger.error("Corporate => " + error.toString());
                    res.status(500).send(error);
                }
                if (corporate) {
                    res.send({ corporate });
                }
            })
        } else {
            res.status(500).send("Invalid data")
        }
    } catch (error) {
        logger.error("Corporate => " + error.toString());
        res.status(500).send(error);
    }
}

const pay = (req, res) => {
    try {
        if (req.params.id && req.body.amount && req.body.year && req.body.month) {
            var start = new Date(req.body.year, req.body.month, 1);
            var end = new Date(req.body.year, req.body.month + 1, 0);
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            CorporatePayment.create({
                corporate: req.params.id,
                startTimestamp: start,
                endTimestamp: end,
                amount: req.body.amount,
                month: monthNames[req.body.month]
            }, (error, payment) => {
                if (error) {
                    logger.error("Corporate => " + error.toString());
                    res.status(500).send(error);
                }

                if (payment) {
                    res.send(payment);
                }
            })
        } else {
            res.status(500).send("Invalid data");
        }
    } catch (error) {
        logger.error("Corporate => " + error.toString());
        res.status(500).send(error);
    }
}

const update = async (req, res) => {
    try {
        const updatedCorporate = await Corporate.updateOne({ '_id': req.params.id }, req.body);
        res.send(updatedCorporate);
    } catch (error) {
        logger.error("Corporate => " + error.toString());
        res.status(500).send(error);
    }
}

const remove = async (req, res) => {
    try {
        const deletedCorporate = await Corporate.remove({ _id: req.params.id });
        res.send(deletedCorporate);
    } catch (error) {
        res.status(500).send(error);
    }
}

module.exports = { index, show, store, update, remove, trips, dashboard, search, pay, tickets };