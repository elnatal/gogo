const SOS = require("../models/SOS");
const Ride = require("../models/Ride");
const Rent = require("../models/Rent");
const { getAllDispatchers } = require("../containers/dispatcherContainer");
const logger = require("../services/logger");

module.exports = (io) => {
    const index = async (req, res) => {
        try {
            var page = 1;
            var skip = 0;
            var limit = 20;
            var nextPage;
            var prevPage;
            var filter = {};

            if (req.query.passenger != null && req.query.passenger != 'all') {
                filter['passenger'] = req.query.passenger;
            }


            if (req.query.driver != null && req.query.driver != 'all') {
                filter['driver'] = req.query.driver;
            }


            if (req.query.type != null && req.query.type != 'all') {
                filter['type'] = req.query.type;
            }

            var sos = SOS.find(filter);
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
                SOS.countDocuments(filter),
                sos.exec()
            ]).then((value) => {
                if (value) {
                    if (((page * limit) <= value[0])) {
                        nextPage = page + 1;
                    }

                    res.send({ data: value[1], count: value[0], nextPage, prevPage });
                }
            }).catch((error) => {
                logger.error("SOS => " + error.toString());
                res.status(500).send(error);
            });
        } catch (error) {
            logger.error("SOS => " + error.toString());
            res.status(500).send(error);
        };
    }

    const show = (req, res) => {
        try {
            SOS.findById(req.parse.id, (error, sos) => {
                if (error) {
                    logger.error("SOS => " + error.toString());
                    res.status(500).send(error);
                }
                if (sos) {
                    res.send(sos);
                }
            }).populate('passenger').populate('driver').populate('vehicle');
        } catch (error) {
            logger.error("SOS => " + error.toString());
            res.status(500).send(error);
        }
    }

    const search = (req, res) => {

    }

    const store = (req, res) => {
        try {
            if (req.body && (req.body.tripId || req.body.rentId) && req.body.location && req.body.location.lat && req.body.location.long && req.body.type) {
                if (req.body.tripId) {
                    Ride.findById(req.body.tripId, (error, trip) => {
                        if (error) {
                            logger.error("SOS => " + error.toString());
                            res.status(500).send(error);
                        }

                        if (trip) {
                            SOS.create({
                                driver: trip.driver,
                                passenger: trip.passenger,
                                type: req.body.type,
                                ride: req.body.tripId,
                                rent: req.body.rentId,
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
                                    logger.error("SOS => " + error.toString());
                                    res.status(500).send(error);
                                }
                                if (sos) {
                                    SOS.findById(sos._id, (error, newSos) => {
                                        if (error) {
                                            logger.error("SOS => " + error.toString());
                                            res.status(500).send(error);
                                        }

                                        if (newSos) {
                                            io.to('sos').emit('sos', newSos);
                                            res.send(newSos)
                                        } else {
                                            res.status(500).send("no new sos");
                                        }
                                    }).populate('passenger').populate('driver').populate('vehicle');
                                } else {
                                    res.status(500).send("no sos");
                                }
                            })
                        } else {
                            res.status(500).send("trip not found")
                        }
                    })
                } else if (req.body.rentId) {
                    Rent.findById(req.body.rentId, (error, rent) => {
                        if (error) {
                            logger.error("SOS => " + error.toString());
                            res.status(500).send(error);
                        }

                        if (rent) {
                            SOS.create({
                                driver: rent.driver,
                                passenger: rent.passenger,
                                vehicle: rent.vehicle,
                                rent: req.body.rentId,
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
                                    logger.error("SOS => " + error.toString());
                                    res.status(500).send(error);
                                }
                                if (sos) {
                                    SOS.findById(sos._id, (error, newSos) => {
                                        if (error) {
                                            logger.error("SOS => " + error.toString());
                                            res.status(500).send(error);
                                        }

                                        if (newSos) {
                                            io.to('sos').emit('sos', newSos);
                                            res.send(newSos)
                                        }
                                    }).populate('passenger').populate('driver').populate('vehicle');
                                };
                            })
                        } else {
                            res.status(500).send("rent not found")
                        }
                    })
                }
            }
        } catch (error) {
            logger.error("SOS => " + error.toString());
            res.status(500).send(error);
        }
    }
    return { index, store, show };
};