const express = require('express');
const router = express.Router();
const VehicleType = require('../models/VehicleType');

router.get('/', async (req, res) => {
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
            VehicleType.countDocuments(),
            vehicleType.exec()
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
});

router.get('/:id', async (req, res) => {
    try {
        var vehicleType = await VehicleType.findById(req.params.id);
        console.log(req.params.id);
        res.send(vehicleType);
    } catch(err) {
        res.send('err ' + err);
    };
});

router.post('/', async (req, res) => {
    try {
        const savedVehicleType = await VehicleType.create(req.body);
        res.send(savedVehicleType);
    } catch(err) {
        console.log(err);
        res.send(err);
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const updatedVehicleType = await VehicleType.updateOne({'_id': req.params.id}, req.body);
        res.send(updatedVehicleType);
    } catch(err) {
        console.log(err);
        res.send({"message": "error => " + err});
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedVehicleType = await VehicleType.remove({_id: req.params.id});
        res.send(deletedVehicleType);
    } catch(err) {
        res.send(err);
    }
})

module.exports = router;