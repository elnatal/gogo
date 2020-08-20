const Corporate = require('../models/Corporate');
const bcrypt = require('bcryptjs');
const Ticket = require('../models/Ticket');
const Ride = require('../models/Ride');
const Account = require('../models/Account');

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var corporates = Corporate.find();
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
            Corporate.countDocuments(),
            corporates.exec()
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
        console.log({rides});
        res.send(rides);
    } catch (error) {
        console.log({error});
        res.status(500).send({error});
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
            Ride.countDocuments({"corporate": req.params.id}),
            Ride.where({
                corporate: req.params.id,
                endTimestamp: {$gte: start},
                endTimestamp: {$lte: end}
            }),
            Ticket.countDocuments({"corporate": req.params.id})
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

                res.send({totalTrips: value[0], monthlyTrip: totalTrips, tickets: value[2], monthlyCost: total});
            } else {
                res.status(500).send("Something went wrong!")
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
};

const show = async (req, res) => {
    try {
        var corporate = await Corporate.findById(req.params.id);
        console.log(req.params.id);
        res.send(corporate);
    } catch (err) {
        res.send('err ' + err);
    };
}

const store = async (req, res) => {
    try {
        const data = req.body;
        console.log({ data })
        if (data.password && data.name && data.shortName && data.firstName && data.lastName && data.email && data.roles) {
            data["password"] = await bcrypt.hash(data["password"], 5);

            Corporate.create({  
                name: data.name,
                shortName: data.shortName
            }, (err, corporate) => {
                if (err) {
                    console.log({err});
                    res.status(500).send(err);
                }
                if (corporate) {
                    Account.create({
                        firstName: data.firstName,
                        lastName: data.lastName,
                        password: data.password,
                        email: data.email,
                        roles: [4],
                        profileImage: data.profileImage,
                        corporate: corporate._id
                    }, (err, account) => {
                        if (err) {
                            console.log({err});
                            Corporate.deleteOne({_id: corporate._id}, (err, res) => {
                                if (err) console.log({err});
                                if (res) console.log("deleted");
                            })
                            res.status(500).send(err);
                        }
                        if (account) {
                            res.send({account, corporate});
                        }
                    })
                }
            })
        } else {
            res.status(500).send("Invalid data")
        }
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
}

const update = async (req, res) => {
    try {
        const updatedCorporate = await Corporate.updateOne({ '_id': req.params.id }, req.body);
        res.send(updatedCorporate);
    } catch (err) {
        console.log(err);
        res.status(500).send({ "message": "error => " + err });
    }
}

const remove = async (req, res) => {
    try {
        const deletedCorporate = await Corporate.remove({ _id: req.params.id });
        res.send(deletedCorporate);
    } catch (err) {
        res.status(500).send(err);
    }
}

module.exports = { index, show, store, update, remove, trips, dashboard };