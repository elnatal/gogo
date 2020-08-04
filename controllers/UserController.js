const User = require('../models/User');
const Ride = require('../models/Ride');

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var user =  User.find();
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
        
        user.sort({createdAt: 'desc'});
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
                if (((page  * limit) <= value[0])) {
                    nextPage = page + 1;
                }
                res.send({data: value[1], count: value[0], nextPage, prevPage});
            }
        });
    } catch(err) {
        res.send('err ' + err);
    };
};

const firebaseAuth = async (req, res) => {
    try {
        var user = await User.findOne({firebaseId: req.params.firebaseId});
        if (user) {
            res.send(user);
        } else {
            res.status(404).send("User doesn't exist");
        }
    } catch(error) {
        res.send(error);
    };
};

const show = async (req, res) => {
    try {
        var user = await User.findById(req.params.id);
        res.send(user);
    } catch(err) {
        res.send('err ' + err);
    };
};

const bookings = (req, res) => {
    try {
        Ride.find({passenger: req.params.id}, (err, rides) => {
            res.send(rides);
        }).sort({createdAt: 'desc'}).limit(15).populate('driver').populate('vehicleType').populate('vehicle');
    } catch (error) {
        console.log(error);
    }
};

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
        console.log(error);
        res.status(500).send(error);
    }
}

const store = async (req, res) => {
    try {
        const savedUser = await User.create(req.body);
        res.send(savedUser);
    } catch(err) {
        console.log(err);
        res.send(err);
    }
};

const update = async (req, res) => {
    try {
        await User.updateOne({'_id': req.params.id}, req.body);
        const user = await User.findById(req.params.id);
        res.send(user);
    } catch(err) {
        console.log(err);
        res.send({"message": "error => " + err});
    }
};

const remove = async (req, res) => {
    try {
        const deletedUser = await User.remove({_id: req.params.id});
        res.send(deletedUser);
    } catch(err) {
        res.send(err);
    }
};

module.exports = { index, firebaseAuth, bookings, show, store, update, remove, rate };