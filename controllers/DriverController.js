const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const mongoose = require('mongoose');
const Token = require('../models/Token');
const Setting = require('../models/Setting');
const Rent = require('../models/Rent');
const WalletHistory = require('../models/WalletHistory');

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;
        var filter = {};

        if (req.query.approved != null && req.query.approved != 'all') {
            filter['approved'] = req.query.approved;
        }

        if (req.query.active != null && req.query.active != 'all') {
            filter['active'] = req.query.active;
        }

        var drives = Driver.find(filter);
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

        drives.sort({ createdAt: 'desc' });
        drives.limit(limit);
        drives.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                drives.populate(e);
            });
        }
        Promise.all([
            Driver.countDocuments(filter),
            drives.exec()
        ]).then(async (value) => {
            if (value) {
                if (((page * limit) <= value[0])) {
                    nextPage = page + 1;
                }

                var result = value[1].map((driver) => mongoose.Types.ObjectId(driver._id));

                var vehicles = await Vehicle.find({ driver: { $in: result } });

                value[1].map((driver) => {
                    var vehicle = vehicles.find((v) => v.driver.toString() == driver._id.toString());
                    if (vehicle) {
                        driver._doc["vehicle"] = vehicle;
                    }
                    return driver;
                })
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
};

const auth = async (req, res) => {
    try {
        if (req.query.token) {
            var token = await Token.findById(req.query.token).populate('driver');
            if (token && token.active && token.driver && token.driver.phoneNumber == req.params.phone) {
                var driver = token.driver;
                driver._doc["token"] = token._id;
                var vehicle = await Vehicle.findOne({ driver: driver._id }).populate('vehicleType');
                var setting = await Setting.findOne();
                if (vehicle) {
                    res.send({ driver, vehicle, setting });
                } else {
                    res.send({ driver, vehicle: null, setting });
                }
            } else {
                res.status(401).send("Unauthorized");
            }
        } else {
            var driver = await Driver.findOne({ phoneNumber: req.params.phone });
            if (driver) {
                await Token.update({ driver: driver._id }, { active: false });
                var token = await Token.create({ active: true, driver: driver._id, role: 5, });
                if (token) {
                    driver._doc["token"] = token._id;
                    var vehicle = await Vehicle.findOne({ driver: driver._id }).populate('vehicleType');
                    var setting = await Setting.findOne();
                    if (vehicle) {
                        res.send({ driver, vehicle, setting });
                    } else {
                        res.send({ driver, vehicle: null, setting });
                    }
                } else {
                    res.status(500).send("Token Error");
                }
            } else {
                res.status(404).send("Unknown Driver");
            }
        }
    } catch (error) {
        res.status(401).send("Unauthorized");
    };
};

const search = (req, res) => {
    try {
        var limit = 10;
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
        };

        if (req.query.approved != null && req.query.approved != 'all') {
            filter['approved'] = req.query.approved;
        }

        if (req.query.active != null && req.query.active != 'all') {
            filter['active'] = req.query.active;
        }

        if (req.query.limit != null) {
            limit = parseInt(req.query.limit);
        }

        Driver.find(filter, async (error, drivers) => {
            if (error) {
                console.log(error);
                res.status(500).send(error);
            }

            if (drivers) {
                if (req.query.vehicle) {
                    console.log("vehicle");
                    var result = drivers.map((driver) => mongoose.Types.ObjectId(driver._id));
                    var vehicles = await Vehicle.find({ driver: { $in: result } });

                    drivers.map((driver) => {
                        var vehicle = vehicles.find((v) => v.driver.toString() == driver._id.toString());
                        if (vehicle) {
                            driver._doc["vehicle"] = vehicle;
                            console.log({ driver });
                        }
                        return driver;
                    })
                }
                res.send(drivers);
            }
        }).limit(limit);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

const income = (req, res) => {
    try {
        var monthIncome = 0;
        var dailyIncome = 0;
        var start = new Date();
        start.setDate(1);
        Promise.all([
            Rent.find({
                driver: req.params.id, endTimestamp: { $gte: start }
            }),
            Ride.find({ driver: req.params.id, endTimestamp: { $gte: start } })
        ]).then((values) => {
            const today = new Date();
            values[0].forEach((rent) => {
                if (rent.status == "Completed") {
                    monthIncome += rent.fare - rent.companyCut;
                    if (new Date(rent.endTimestamp).getDate() == today.getDate()) {
                        dailyIncome += rent.fare - rent.companyCut;
                    }
                }
            })

            values[1].forEach((trip) => {
                if (trip.status == "Completed") {
                    monthIncome += trip.fare - trip.companyCut;
                    if (new Date(trip.endTimestamp).getDate() == today.getDate()) {
                        dailyIncome += trip.fare - trip.companyCut;
                    }
                }
            })

            res.send({ month: monthIncome, dailyIncome })
        }).catch((error) => {
            console.log(error);
            res.status(500).send(error);
        })
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

const show = (req, res) => {
    try {
        Driver.findById(req.params.id, (err, driver) => {
            if (err) console.log(err);
            if (driver) {
                console.log({ "drivers": driver });
                Vehicle.findOne({ driver: driver._id }, (err, vehicle) => {
                    if (err) console.log(err);
                    if (vehicle) {
                        res.send({ driver, vehicle });
                    } else {
                        res.send({ driver, vehicle: null });
                    }
                }).populate('vehicleType');
            } else {
                res.status(404).send("Unknown Driver");
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    };
};

const bookings = (req, res) => {
    try {
        Ride.find({ driver: req.params.id }, 'driver, type passenger pickupTimestamp endTimestamp pickUpAddress dropOffAddress vehicleType totalDistance fare discount status active corporate bidAmount', (err, rides) => {
            res.send(rides);
        }).sort({ createdAt: 'desc' }).limit(15).populate('driver').populate('passenger').populate({ path: 'vehicleType', select: 'name -_id' });
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
};

const scheduledTrips = (req, res) => {
    try {
        Ride.find({ driver: req.params.id, status: "Scheduled" }, (error, trips) => {
            if (error) {
                console.log(error);
                res.status(500).send(error);
            }

            if (trips) {
                res.send(trips);
            }
        }).sort({ createdAt: 'desc' }).limit(15).populate('passenger').populate('vehicleType').populate('vehicle');
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

const rents = (req, res) => {
    try {
        Rent.find({ driver: req.params.id }, (error, rents) => {
            if (error) {
                console.log(error);
                res.status(500).send(error);
            }
            if (rents) {
                res.send(rents);
            }
        }).sort({ createdAt: 'desc' }).limit(15).populate('passenger').populate('vehicleType').populate('vehicle')
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

const topUp = (req, res) => {
    try {
        if (req.params.id && req.body.amount && req.body.amount > 0) {
            Driver.findById(req.params.id, async (error, driver) => {
                if (error) {
                    console.log(error);
                    res.status(500).send(error);
                }
                if (driver) {
                    var ballance = driver.ballance + req.body.amount;
                    Driver.updateOne({ _id: req.params.id }, {ballance}, (error, updateResponse) => {
                        if (error) {
                            console.log(error);
                            res.status(500).send(error);
                        }
                        if (updateResponse) {
                            WalletHistory.create({ driver: req.params.id, amount: req.body.amount }, (error, wallet) => {
                                if (error) {
                                    console.log(error);
                                    res.status(500).send(error);
                                }
                                if (wallet) {
                                    console.log("balance", driver.balance);
                                    res.send({ ballance });
                                }
                            })
                        }
                    })
                }
            });
        } else {
            res.status(500).send("Invalid data");
        }
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

const walletHistory = (req, res) => {
    try {
        WalletHistory.find({ driver: req.params.id }, (error, walletHistory) => {
            if (error) {
                console.log(error);
                res.status(500).send(error);
            }
            if (walletHistory) {
                res.send(walletHistory);
            }
        }).sort({ createdAt: 'desc' }).limit(20).populate('driver');
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

const rate = async (req, res) => {
    try {
        if (req.params.id && req.body && req.body.tripId && req.body.rate) {
            const driver = await Driver.findById(req.params.id);

            if (driver) {
                driver.rating = (((driver.rating * driver.rateCount) + req.body.rate) / (driver.rateCount + 1));
                driver.rateCount = driver.rateCount + 1;
                driver.save();
            }

            const trip = await Ride.findById(req.body.tripId);
            if (trip) {
                trip.passengerRate = req.body.rate;
                trip.save();
            }
            res.send("Rated");
        }
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

const updateWallet = (data) => {
    WalletHistory.create({
        driver: data.id,
        amount: data.amount
    }, (error, response) => {
        if (error) console.log(error);
        if (response) {
            Driver.findById(data.id, (error, res) => {
                if (error) console.log(error);
                if (res) {
                    res.ballance += data.amount;
                    res.save();
                }
            })
        }
    });
}

const store = async (req, res) => {
    try {
        const savedDriver = await Driver.create(req.body);
        var token = await Token.create({ active: true, driver: savedDriver._id, role: 5, });
        savedDriver._doc["token"] = token._id;
        res.send(savedDriver);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
};

const update = async (req, res) => {
    try {
        const updatedDriver = await Driver.updateOne({ '_id': req.params.id }, req.body);
        res.send(updatedDriver);
    } catch (err) {
        console.log(err);
        res.status(500).send({ "message": "error => " + err });
    }
};

const remove = async (req, res) => {
    try {
        const deletedDriver = await Driver.remove({ _id: req.params.id });
        res.send(deletedDriver);
    } catch (err) {
        res.status(500).send(err);
    }
};

module.exports = { index, auth, show, bookings, store, update, remove, rate, search, scheduledTrips, rents, topUp, walletHistory, income, updateWallet };