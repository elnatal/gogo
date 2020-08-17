const Corporate = require('../models/Corporate');
const bcrypt = require('bcryptjs');
const Ticket = require('../models/Ticket');

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var corporates = Corporate.find();
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

        corporates.sort({ createdAt: 'desc' });
        corporates.limit(limit);
        corporates.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                corporates.populate(e);
            });
        }
        Promise.all([
            Corporate.countDocuments(),
            corporates.exec()
        ]).then(async (value) => {
            if (value) {
                if (((page * limit) <= value[0])) {
                    nextPage = page + 1;
                }

                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        });
    } catch (error) {
        res.send(error);
    };
}

const usedTickets = async (req, res) => {
    try {
        var filter = {
            corporate: req.params.id,
            active: false
        };
        if (req.query.start || req.query.end) {
            filter["timestamp"] = {};
        }
        if (req.query.start) {
            filter.timestamp["$gte"] = req.query.start;
        }
        if (req.query.end) {
            filter.timestamp["$lte"] = req.query.end;
        }
        var tickets = await Ticket.find(filter).populate('ride');
        console.log({tickets});
        res.send(tickets);
    } catch (error) {
        console.log({error});
        res.status(500).send({error});
    }
}

const show = async (req, res) => {
    try {
        var corporate = await Corporate.findById(req.params.id);
        console.log(req.params.id);
        res.send(corporate);
    } catch (err) {
        res.send('err ' + err);
    };
}

const store = async (req, res) => {
    try {
        const data = req.body;
        console.log({ data })
        if (data['password']) {
            data["password"] = await bcrypt.hash(data["password"], 5);
        }
        console.log(data.password);

        const savedCorporate = await Corporate.create(data);
        res.send(savedCorporate);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
}

const update = async (req, res) => {
    try {
        const updatedCorporate = await Corporate.updateOne({ '_id': req.params.id }, req.body);
        res.send(updatedCorporate);
    } catch (err) {
        console.log(err);
        res.status(500).send({ "message": "error => " + err });
    }
}

const remove = async (req, res) => {
    try {
        const deletedCorporate = await Corporate.remove({ _id: req.params.id });
        res.send(deletedCorporate);
    } catch (err) {
        res.status(500).send(err);
    }
}

module.exports = { index, show, store, update, remove, usedTickets };