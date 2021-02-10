const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const mongoose = require('mongoose');
const Token = require('../models/Token');
const Setting = require('../models/Setting');
const Rent = require('../models/Rent');
const WalletHistory = require('../models/WalletHistory');
const logger = require('../services/logger');
const Loan = require('../models/Loan');

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

        if (req.query.date != null && req.query.date) {
            var endDate = new Date(req.query.date);
            endDate.setHours(24);

            filter['$and'] = [
                { 'createdAt': { $gte: new Date(req.query.date) } },
                { 'createdAt': { $lte: endDate } }
            ];
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
            logger.error("Driver => " + error.toString());
            res.status(500).send(error);
        });
    } catch (error) {
        logger.error("Driver => " + error.toString());
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
                logger.error("Driver => " + error.toString());
                res.status(500).send(error);
            }

            if (drivers) {
                if (req.query.vehicle) {
                    var result = drivers.map((driver) => mongoose.Types.ObjectId(driver._id));
                    var vehicles = await Vehicle.find({ driver: { $in: result } });

                    drivers.map((driver) => {
                        var vehicle = vehicles.find((v) => v.driver.toString() == driver._id.toString());
                        if (vehicle) {
                            driver._doc["vehicle"] = vehicle;
                        }
                        return driver;
                    })
                }
                res.send(drivers);
            }
        }).limit(limit);
    } catch (error) {
        logger.error("Driver => " + error.toString());
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
            logger.error("Driver => " + error.toString());
            res.status(500).send(error);
        })
    } catch (error) {
        logger.error("Driver => " + error.toString());
        res.status(500).send(error);
    }
}

const show = (req, res) => {
    try {
        Driver.findById(req.params.id, (error, driver) => {
            if (error) logger.error("Driver => " + error.toString());
            if (driver) {
                Vehicle.findOne({ driver: driver._id }, (error, vehicle) => {
                    if (error) logger.error("Driver => " + error.toString());
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
        logger.error("Driver => " + error.toString());
        res.status(500).send(error);
    };
};

const bookings = (req, res) => {
    try {
        Ride.find({ driver: req.params.id }, 'driver, type passenger pickupTimestamp endTimestamp pickUpAddress dropOffAddress vehicleType totalDistance fare discount status active corporate bidAmount', (error, rides) => {
            res.send(rides);
        }).sort({ createdAt: 'desc' }).limit(15).populate('driver').populate('passenger').populate({ path: 'vehicleType', select: 'name -_id' });
    } catch (error) {
        logger.error("Driver => " + error.toString());
        res.status(500).send(error);
    }
};

const scheduledTrips = (req, res) => {
    try {
        Ride.find({ driver: req.params.id, status: "Scheduled" }, (error, trips) => {
            if (error) {
                logger.error("Driver => " + error.toString());
                res.status(500).send(error);
            }

            if (trips) {
                res.send(trips);
            }
        }).sort({ createdAt: 'desc' }).limit(15).populate('passenger').populate('vehicleType').populate('vehicle');
    } catch (error) {
        logger.error("Driver => " + error.toString());
        res.status(500).send(error);
    }
}

const rents = (req, res) => {
    try {
        Rent.find({ driver: req.params.id }, (error, rents) => {
            if (error) {
                logger.error("Driver => " + error.toString());
                res.status(500).send(error);
            }
            if (rents) {
                res.send(rents);
            }
        }).sort({ createdAt: 'desc' }).limit(15).populate('passenger').populate('vehicleType').populate('vehicle')
    } catch (error) {
        logger.error("Driver => " + error.toString());
        res.status(500).send(error);
    }
}

const topUp = (req, res) => {
    try {
        if (req.params.id && req.body.amount && req.body.amount > 0 && req.body.account && req.body.reason, req.body.paymentType) {
            Driver.findById(req.params.id, async (error, driver) => {
                if (error) {
                    logger.error("Top up => " + error.toString());
                    res.status(500).send(error);
                }
                if (driver) {
                    Loan.find({ to: req.params.id, paid: false }, (error, loans) => {
                        if (error) {
                            logger.error("Top up => " + error.toString());
                            res.status(500).send(error);
                        }
                        if (loans) {
                            var topUpAmount = req.body.amount;
                            loans.forEach(async (loan) => {
                                if (topUpAmount >= loan.amount) {
                                    topUpAmount -= loan.amount - loan.paidAmount;
                                    loan.paidAmount = loan.amount;
                                    loan.paid = true;
                                    var secondDriver = await Driver.findById(loan.from);
                                    if (secondDriver) {
                                        secondDriver.ballance = secondDriver.ballance + loan.paidAmount;
                                        await secondDriver.save();
                                        await WalletHistory.create({
                                            driver: loan.from,
                                            reason: "Wallet loan pay back",
                                            by: "System",
                                            amount: loan.paidAmount,
                                            from: loan.to
                                        });
                                    }
                                } else if (topUpAmount > 0) {
                                    topUpAmount = 0;
                                    loan.paidAmount = topUpAmount;
                                    loan.paid = false;
                                    var secondDriver = await Driver.findById(loan.from);
                                    if (secondDriver) {
                                        secondDriver.ballance = secondDriver.ballance + loan.paidAmount;
                                        await secondDriver.save();
                                        await WalletHistory.create({
                                            driver: loan.from,
                                            reason: "Wallet loan pay back",
                                            by: "System",
                                            amount: loan.paidAmount,
                                            from: loan.to
                                        });
                                    }
                                }
                                await loan.save();
                            });

                            if (topUpAmount > 0) {
                                var ballance = driver.ballance + topUpAmount;
                                Driver.updateOne({ _id: req.params.id }, { ballance }, (error, updateResponse) => {
                                    if (error) {
                                        logger.error("Top up => " + error.toString());
                                        res.status(500).send(error);
                                    }
                                    if (updateResponse) {
                                        WalletHistory.create({ driver: req.params.id, amount: topUpAmount, reason: req.body.reason, by: 'admin', account: req.body.account, paymentType: req.body.paymentType }, (error, wallet) => {
                                            if (error) {
                                                logger.error("Top up => " + error.toString());
                                                res.status(500).send(error);
                                            }
                                            if (wallet) {
                                                logger.info(`Driver => top up, amount = ${topUpAmount} , balance = ${ballance}`);
                                                res.send({ ballance });
                                            }
                                        })
                                    }
                                })
                            } else {
                                res.send({ ballance: driver.ballance });
                            }
                        }
                    });
                }
            });
        } else {
            res.status(500).send("Invalid data");
        }
    } catch (error) {
        logger.error("Top up => " + error.toString());
        res.status(500).send(error);
    }
}

const walletHistory = (req, res) => {
    try {
        WalletHistory.find({ driver: req.params.id }, (error, walletHistory) => {
            if (error) {
                logger.error("Driver => " + error.toString());
                res.status(500).send(error);
            }
            if (walletHistory) {
                res.send(walletHistory);
            }
        }).sort({ createdAt: 'desc' }).limit(20).populate('driver').populate('account');
    } catch (error) {
        logger.error("Driver => " + error.toString());
        res.status(500).send(error);
    }
}

const walletTransfer = (req, res) => {
    try {
        if (req.params.id && req.body.amount && req.body.amount > 0 && req.body.to) {
            Driver.findById(req.params.id, (error, driver) => {
                if (error) {
                    logger.error("Wallet transfer => " + error.toString());
                    res.status(500).send(error);
                }
                if (driver) {
                    if (driver.ballance > req.body.amount) {
                        WalletHistory.create({
                            driver: req.body.to,
                            reason: "Wallet transfer",
                            by: "Driver",
                            amount: req.body.amount,
                            from: req.params.id
                        }, (error, response) => {
                            if (error) {
                                res.status(500).send(error);
                                logger.error("Wallet transfer => " + error.toString());
                            }
                            if (response) {
                                driver.ballance = driver.ballance - req.body.amount;
                                driver.save();
                                logger.info(`Driver ${req.params.id} => Wallet transfer, amount = ${req.body.amount} , balance = ${driver.ballance}`);
                                Driver.findById(req.body.to, (error, secondDriver) => {
                                    if (error) {
                                        res.status(500).send(error);
                                        logger.error("Wallet transfer => " + error.toString());
                                    }
                                    if (secondDriver) {
                                        secondDriver.ballance += req.body.amount;
                                        secondDriver.save();
                                        logger.info(`Driver ${req.body.to} => Wallet transfer, amount = ${req.body.amount} , balance = ${secondDriver.ballance}`);
                                        res.send("success")
                                    }
                                })
                            }
                        });
                    } else {
                        res.status(500).send("your ballance is low");
                    }
                }
            })
        } else {
            res.status(500).send("invalid data");
        }
    } catch (error) {
        logger.error("Wallet transfer => " + error.toString());
        res.status(500).send(error);
    }
}

const lend = (req, res) => {
    try {
        if (req.params.id && req.body.amount && req.body.amount > 0 && req.body.to) {
            Driver.findById(req.params.id, (error, driver) => {
                if (error) {
                    logger.error("Wallet lend => " + error.toString());
                    res.status(500).send(error);
                }
                if (driver) {
                    if (driver.ballance > req.body.amount) {
                        Loan.create({
                            from: req.params.id,
                            to: req.body.to,
                            amount: req.body.amount,
                            paid: false
                        }, (error, loan) => {
                            if (error) {
                                logger.error("Wallet lend => " + error.toString());
                                res.status(500).send(error);
                            }
                            if (loan) {
                                driver.ballance = driver.ballance - req.body.amount;
                                driver.save();
                                logger.info(`Driver ${req.params.id} => Wallet loan, amount = ${req.body.amount} , balance = ${driver.ballance}`);
                                Driver.findById(req.body.to, (error, secondDriver) => {
                                    if (error) {
                                        res.status(500).send(error);
                                        logger.error("Wallet lend => " + error.toString());
                                    }
                                    if (secondDriver) {
                                        secondDriver.ballance += req.body.amount;
                                        secondDriver.save();
                                        logger.info(`Driver ${req.body.to} => Wallet loan, amount = ${req.body.amount} , balance = ${secondDriver.ballance}`);
                                        res.send("success")
                                    }
                                })
                            }
                        });
                    }
                    else {
                        res.status(500).send("your ballance is low");
                    }
                }
            })
        } else {
            logger.error("Wallet lend => " + error.toString());
            res.status(500).send("invalid data");
        }
    } catch (error) {
        logger.error("Wallet lend => " + error.toString());
        res.status(500).send(error);
    }
}

const rate = async (req, res) => {
    try {
        if (req.params.id && req.body && req.body.tripId && req.body.rate) {
            const driver = await Driver.findById(req.params.id);

            if (driver && req.body.rate) {
                var rating = driver.rating ? driver.rating : 5;
                var rateCount = driver.rateCount ? driver.rateCount : 1;
                driver.rating = (((rating * rateCount) + req.body.rate) / (rateCount + 1));
                driver.rateCount = rateCount + 1;
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
        logger.error("Driver => " + error.toString());
        res.status(500).send(error);
    }
}

const updateWallet = (data) => {
    WalletHistory.create({
        driver: data.id,
        reason: "company cut",
        by: "System",
        amount: data.amount
    }, (error, response) => {
        if (error) logger.error("Driver => " + error.toString());
        if (response) {
            Driver.findById(data.id, (error, res) => {
                if (error) logger.error("Driver => " + error.toString());
                if (res) {
                    res.ballance += data.amount;
                    res.save();
                    logger.info(`Driver => company cut, amount = ${data.amount} , balance = ${res.ballance}`)
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
    } catch (error) {
        logger.error("Driver => " + error.toString());
        res.status(500).send(error);
    }
};

const update = async (req, res) => {
    try {
        const updatedDriver = await Driver.updateOne({ '_id': req.params.id }, req.body);
        res.send(updatedDriver);
    } catch (error) {
        logger.error("Driver => " + error.toString());
        res.status(500).send({ "message": "error => " + error });
    }
};

const remove = async (req, res) => {
    try {
        const deletedDriver = await Driver.remove({ _id: req.params.id });
        res.send(deletedDriver);
    } catch (error) {
        logger.error("Driver => " + error.toString());
        res.status(500).send(error);
    }
};

module.exports = { index, auth, show, bookings, store, update, remove, rate, search, scheduledTrips, rents, topUp, walletHistory, income, updateWallet, walletTransfer, lend };