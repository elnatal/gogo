const Ticket = require('../models/Ticket');
const Corporate = require('../models/Corporate');
const Account = require('../models/Account');
const Employee = require('../models/Employee');
const logger = require('../services/logger');

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var tickets = Ticket.find();
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

        tickets.sort({ createdAt: 'desc' });
        tickets.limit(limit);
        tickets.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                tickets.populate(e);
            });
        }
        Promise.all([
            Ticket.countDocuments(),
            tickets.exec()
        ]).then(async (value) => {
            if (value) {
                if (((page * limit) <= value[0])) {
                    nextPage = page + 1;
                }

                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        }).catch((error) => {
            logger.error("Ticket => " + error.toString());
            res.status(500).send(error);
        });
    } catch (error) {
        logger.error("Ticket => " + error.toString());
        res.status(500).send(error);
    };
}

const show = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        res.send(ticket);
    } catch (error) {
        logger.error("Ticket => " + error.toString());
        res.status(500).send(error);
    };
}

const validate = async (req, res) => {
    try {
        if (req.params.code && req.params.phone) {
            const ticket = await Ticket.findOne({ code: req.params.code }).populate('employee');
            if (ticket && ticket.employee && ticket.active == true && ticket.employee.phone == req.params.phone) {
                res.send(ticket._id);
            } else {
                res.status(500).send("Invalid");
            }
        } else {
            logger.error("Ticket => Invalid data");
            res.status(500).send("Invalid data");
        }
    } catch (error) {
        logger.error("Ticket => " + error.toString());
        res.status(500).send(error);
    }
}

const generate = async (req, res) => {
    try {
        var id = req.params.id;
        var account = await Account.findById(id).populate('corporate');
        if (account && account.corporate && req.body.employee) {
            var corporate = account.corporate
            var code = corporate.shortName + ":" + Math.random().toString(36).substring(7);
            var found = false;

            while (!found) {
                var ticket = await Ticket.findOne({ code });
                if (ticket) {
                    code = corporate.shortName + ":" + Math.random().toString(36).substring(7);
                } else {
                    found = true;
                }
            }

            const savedTicket = await Ticket.create({ code, corporate: account.corporate._id, employee: req.body.employee });
            res.send(savedTicket);
        } else {
            res.status(500).send({ error: "Unknown account" })
        }
    } catch (error) {
        logger.error("Ticket => " + error.toString());
        res.status(500).send(error);
    }
}

const update = async (req, res) => {
    try {
        const updatedTicket = await Ticket.updateOne({ '_id': req.params.id }, req.body);
        res.send(updatedTicket);
    } catch (err) {
        logger.error("Ticket => " + error.toString());
        res.status(500).send(error);
    }
}

const remove = async (req, res) => {
    try {
        const deletedTicket = await Ticket.remove({ _id: req.params.id });
        res.send(deletedTicket);
    } catch (err) {
        logger.error("Ticket => " + error.toString());
        res.status(500).send(error);
    }
}

module.exports = { index, show, generate, update, remove, validate };