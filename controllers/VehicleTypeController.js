const VehicleType = require('../models/VehicleType');

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var vehicleType =  VehicleType.find();
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
        
        vehicleType.sort({createdAt: 'desc'});
        vehicleType.limit(limit);
        vehicleType.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                vehicleType.populate(e);
            });
        }
        Promise.all([
            VehicleType.estimatedDocumentCount(),
            vehicleType.exec()
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
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    };
};

const show =  async (req, res) => {
    try {
        var vehicleType = await VehicleType.findById(req.params.id);
        console.log(req.params.id);
        res.send(vehicleType);
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    };
};

const store = async (req, res) => {
    try {
        const savedVehicleType = await VehicleType.create(req.body);
        res.send(savedVehicleType);
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    }
};

const update = async (req, res) => {
    try {
        const updatedVehicleType = await VehicleType.updateOne({'_id': req.params.id}, req.body);
        res.send(updatedVehicleType);
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    }
};

const remove =  async (req, res) => {
    try {
        const deletedVehicleType = await VehicleType.remove({_id: req.params.id});
        res.send(deletedVehicleType);
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    }
};

module.exports = { index, show, store, update, remove };