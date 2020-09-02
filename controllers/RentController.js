const Ride = require('../models/Ride');
const { request, json } = require('express');
const { send } = require('../services/emailService');
const { getDriver } = require('../containers/driversContainer');
const { getUser } = require('../containers/usersContainer');
const { sendNotification } = require('../services/notificationService');
const Rent = require('../models/Rent');

const index = (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;
        var filter = {};

        if (req.query.status != null && req.query.status != 'all') {
            filter['status'] = {
                $regex: req.query.status, $options: "i"
            };
        }

        if (req.query.driver != null && req.query.driver != 'all') {
            filter['driver'] = req.query.driver;
        }

        if (req.query.passenger != null && req.query.passenger != 'all') {
            filter['passenger'] = req.query.passenger;
        }

        if (req.query.start != null && req.query.start != 'all' && req.query.end != null && req.query.end != 'all') {
            filter['$and'] = [{"pickupTimestamp" : { $gte: new Date(req.query.start) }}, {"pickupTimestamp": { $lte: new Date(req.query.end) }}];
        } else if (req.query.end != null && req.query.end != 'all') {
            filter['pickupTimestamp'] = { $lte: new Date(req.query.end) };
        } else if (req.query.start != null && req.query.start != 'all') {
            filter['pickupTimestamp'] = { $gte: new Date(req.query.start) };
        }

        var rent =  Rent.find(filter);
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
        
        rent.sort({createdAt: 'desc'});
        rent.limit(limit);
        rent.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                rent.populate(e);
            });
        }
        Promise.all([
            Rent.countDocuments(filter),
            rent.exec()
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

const show = async (req, res) => {
    try {
        var rent = await Rent.findById(req.params.id);
        console.log(req.params.id);
        res.send(rent);
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    };
};

const store = async (req, res) => {
    try {
        const savedRent = await Rent.create(req.body);
        res.send(savedRent);
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    }
};

const update = async (req, res) => {
    try {
        const updatedRent = await Rent.updateOne({'_id': req.params.id}, req.body);
        res.send(updatedRent);
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    }
};

const remove = async (req, res) => {
    try {
        const deletedRent = await Rent.remove({_id: req.params.id});
        res.send(deletedRent);
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    }
};

module.exports = { index, show, store, update, remove };