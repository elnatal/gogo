const Ticket = require('../models/Ticket');

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
        });
    } catch (error) {
        res.send(error);
    };
}

const show = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        console.log(req.params.id);
        res.send(ticket);
    } catch (err) {
        res.send('err ' + err);
    };
}

const validate = async (req, res) => {
    try {
        const ticket = await Ticket.findOne({_id: req.page.key});
        if (ticket && ticket.active == true) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}

const store = async (req, res) => {
    try {
        const savedTicket = await Ticket.create(req.body);
        res.send(savedTicket);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
}

const update = async (req, res) => {
    try {
        const updatedTicket = await Ticket.updateOne({ '_id': req.params.id }, req.body);
        res.send(updatedTicket);
    } catch (err) {
        console.log(err);
        res.status(500).send({ "message": "error => " + err });
    }
}

const remove = async (req, res) => {
    try {
        const deletedTicket = await Ticket.remove({ _id: req.params.id });
        res.send(deletedTicket);
    } catch (err) {
        res.status(500).send(err);
    }
}

module.exports = { index, show, store, update, remove, validate };