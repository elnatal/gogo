const User = require('../models/User');
const Ride = require('../models/Ride');
const Rent = require('../models/Rent');
const logger = require('../services/logger');

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var user = User.find();
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

        user.sort({ createdAt: 'desc' });
        user.limit(limit);
        user.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                user.populate(e);
            });
        }
        Promise.all([
            User.countDocuments(),
            user.exec()
        ]).then((value) => {
            if (value) {
                if (((page * limit) <= value[0])) {
                    nextPage = page + 1;
                }
                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        }).catch((error) => {
            logger.error("Passenger => " + error.toString());
            res.status(500).send(error);
        });
    } catch (error) {
        logger.error("Passenger => " + error.toString());
        res.status(500).send(error);
    };
};

const auth = async (req, res) => {
    try {
        var user = await User.findOne({ phoneNumber: req.params.phone });
        if (user) {
            user = user.toJSON();
            var tripCount = await Ride.countDocuments({ passenger: user._id, status: "Completed" });
            user['tripCount'] = tripCount;
            res.send(user);
        } else {
            res.status(404).send("User doesn't exist");
        }
    } catch (error) {
        logger.error("Passenger => " + error.toString());
        res.status(500).send(error);
    };
};

const search = (req, res) => {
    try {
        var filter = {
            $or: [
                {
                    firstName: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }, {
                    lastName: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }, {
                    phoneNumber: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }, {
                    email: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }
            ]
        }

        var limit = 10;

        if (req.query.limit) {
            limit = parseInt(req.query.limit);
        }

        User.find(filter, (error, users) => {
            if (error) {
                logger.error("Passenger => " + error.toString());
                res.status(500).send(error);
            }

            if (users) {
                res.send(users);
            }
        }).limit(limit);
    } catch (error) {
        logger.error("Passenger => " + error.toString());
        res.status(500).send(error);
    }
}

const rents = (req, res) => {
    try {
        Rent.find({passenger: req.params.id}, (error, rents) => {
            if (error) {
                logger.error("Passenger => " + error.toString());
                res.status(500).send(error);
            }
            if (rents) {
                res.send(rents);
            }
        }).sort({ createdAt: 'desc' }).limit(15).populate('driver').populate('vehicleType').populate('vehicle')
    } catch (error) {
        logger.error("Passenger => " + error.toString());
        res.status(500).send(error);
    }
}

const show = async (req, res) => {
    try {
        var user = await (await User.findById(req.params.id)).toJSON();
        var tripCount = await Ride.countDocuments({ passenger: req.params.id, status: "Completed" });
        user['tripCount'] = tripCount;
        res.send(user);
    } catch (error) {
        logger.error("Passenger => " + error.toString());
        res.status(500).send(error);
    };
};

const bookings = (req, res) => {
    try {
        Ride.find({ passenger: req.params.id }, 'driver, type passenger pickupTimestamp endTimestamp pickUpAddress dropOffAddress vehicleType totalDistance fare discount status active corporate bidAmount', (err, rides) => {
            res.send(rides);
        }).sort({ createdAt: 'desc' }).limit(15).populate('passenger').populate('driver').populate('vehicleType').populate('vehicle');
    } catch (error) {
        logger.error("Passenger => " + error.toString());
        res.status(500).send(error);
    }
};

const scheduledTrips = (req, res) => {
    try {
        Ride.find({passenger: req.params.id, status: "Scheduled"}, (error, trips) => {
            if (error) {
                logger.error("Passenger => " + error.toString());
                res.status(500).send(error);
            }

            if (trips) {
                res.send(trips);
            }
        }).sort({ createdAt: 'desc' }).limit(15).populate('driver').populate('vehicleType').populate('vehicle');
    } catch (error) {
        logger.error("Passenger => " + error.toString());
        res.status(500).send(error);
    }
}

const rate = async (req, res) => {
    try {
        if (req.params.id && req.body && req.body.tripId && req.body.rate) {
            const user = await User.findById(req.params.id);

            if (user) {
                user.rating = (((user.rating * user.rateCount) + req.body.rate) / (user.rateCount + 1));
                user.rateCount = user.rateCount + 1;
                user.save();
            }

            const trip = await Ride.findById(req.body.tripId);
            if (trip) {
                trip.driverRate = req.body.rate;
                trip.save();
            }
            res.send("Rated");
        }
    } catch (error) {
        logger.error("Passenger => " + error.toString());
        res.status(500).send(error);
    }
}

const store = async (req, res) => {
    try {
        const savedUser = await User.create(req.body);
        res.send(savedUser);
    } catch (error) {
        logger.error("Passenger => " + error.toString());
        res.status(500).send(error);
    }
};

const update = async (req, res) => {
    try {
        await User.updateOne({ '_id': req.params.id }, req.body);
        const user = await User.findById(req.params.id);
        res.send(user);
    } catch (error) {
        logger.error("Passenger => " + error.toString());
        res.status(500).send(error);
    }
};

const remove = async (req, res) => {
    try {
        const deletedUser = await User.remove({ _id: req.params.id });
        res.send(deletedUser);
    } catch (error) {
        logger.error("Passenger => " + error.toString());
        res.status(500).send(error);
    }
};

module.exports = { index, auth, bookings, show, store, update, remove, rate, search, scheduledTrips, rents };