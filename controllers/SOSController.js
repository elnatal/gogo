const SOS = require("../models/SOS");
const Ride = require("../models/Ride");
const Rent = require("../models/Rent");

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var sos = SOS.find();
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

        sos.sort({ createdAt: 'desc' });
        sos.limit(limit);
        sos.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                sos.populate(e);
            });
        }
        Promise.all([
            SOS.estimatedDocumentCount(),
            sos.exec()
        ]).then((value) => {
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

const show = (req, res) => {
    try {
        SOS.findById(req.parse.id, (error, sos) => {
            if (error) {
                console.log(error);
                res.status(500).send(error);
            }
            if (sos) {
                res.send(sos);
            }
        })
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

const store = (req, res) => {
    try {
        if (req.body && (req.body.tripId || req.body.rentId) && req.body.location && req.body.location.lat && req.body.location.long && req.body.type) {
            if (req.body.tripId) {
                Ride.findById(req.body.tripId, (error, trip) => {
                    if (error) {
                        console.log(error);
                        res.status(500).send(error);
                    }

                    if (trip) {
                        SOS.create({
                            driver: trip.driver,
                            passenger: trip.passenger,
                            type: req.body.type,
                            vehicle: trip.vehicle,
                            position: {
                                type: "Point",
                                coordinates: [
                                    req.body.location.long,
                                    req.body.location.lat
                                ]
                            }
                        }, (error, sos) => {
                            if (error) {
                                console.log(error);
                                res.status(500).send(error);
                            }
                            if (sos) res.send(res);
                        })
                    }
                })
            } else if (req.body.rentId) {
                Rent.findById(req.body.rentId, (error, rent) => {
                    if (error) {
                        console.log(error);
                        res.status(500).send(error);
                    }

                    if (rent) {
                        SOS.create({
                            driver: rent.driver,
                            passenger: rent.passenger,
                            vehicle: rent.vehicle,
                            type: req.body.type,
                            position: {
                                type: "Point",
                                coordinates: [
                                    req.body.location.long,
                                    req.body.location.lat
                                ]
                            }
                        }, (error, sos) => {
                            if (error) {
                                console.log(error);
                                res.status(500).send(error);
                            }
                            if (sos) res.send(res);
                        })
                    }
                })
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

module.exports = { index, store, show };