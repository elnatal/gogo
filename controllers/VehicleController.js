const Vehicle = require('../models/Vehicle');

const index =  async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;
        var filter = {
            $or: [
                {
                    plateNumber: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }, {
                    color: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }, {
                    modelName: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }, {
                    modelYear: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }
            ]
        };

        if (req.query.online != null && req.query.online != 'all') {
            filter['online'] = req.query.online;
        }

        if (req.query.vehicleType != null && req.query.vehicleType != 'all') {
            filter['vehicleType'] = req.query.vehicleType;
        }

        if (req.query.active != null && req.query.active != 'all') {
            filter['active'] = req.query.active;
        }

        var vehicle =  Vehicle.find(filter);
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
        
        vehicle.sort({createdAt: 'desc'});
        vehicle.limit(limit);
        vehicle.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                vehicle.populate(e);
            });
        }
        Promise.all([
            Vehicle.countDocuments(filter),
            vehicle.exec()
        ]).then((value) => {
            if (value) {
                if (((page  * limit) <= value[0])) {
                    nextPage = page + 1;
                }
                res.send({data: value[1], count: value[0], nextPage, prevPage});
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

const activeVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ "online": true }).populate('driver');
        res.send(vehicles);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
};

const search = (req, res) => {
    try {
        var filter = {
            $or: [
                {
                    plateNumber: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }, {
                    color: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }, {
                    modelName: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }, {
                    modelYear: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }
            ]
        };

        if (req.query.vehicleType != null && req.query.vehicleType != 'all') {
            filter['vehicleType'] = req.query.vehicleType;
        }

        if (req.query.online != null && req.query.online != 'all') {
            filter['online'] = req.query.online;
        }

        if (req.query.active != null && req.query.active != 'all') {
            filter['active'] = req.query.active;
        }

        Vehicle.find(filter, (error, vehicles) => {
            if (error) {
                console.log(error);
                res.status(500).send(error);
            }

            if (vehicles) {
                res.send(vehicles);
            }
        }).limit(10).populate('vehicleType').populate('driver');
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

const show = async (req, res) => {
    try {
        var vehicle = await Vehicle.findById(req.params.id);
        console.log(req.params.id);
        res.send(vehicle);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    };
};

const store =  async (req, res) => {
    try {
        const savedVehicle = await Vehicle.create(req.body);
        res.send(savedVehicle);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
};

const update = async (req, res) => {
    try {
        const updatedVehicle = await Vehicle.updateOne({ '_id': req.params.id }, req.body);
        res.send(updatedVehicle);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
};

const remove = async (req, res) => {
    try {
        const deletedVehicle = await Vehicle.remove({ _id: req.params.id });
        res.send(deletedVehicle);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
};

module.exports = { index, activeVehicles, show, store, update, remove, search };