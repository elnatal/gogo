const Dispatcher = require('../models/Dispatcher');
const bcrypt = require('bcryptjs');
require('dotenv/config');

const index = (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var dispatchers = Dispatcher.find();
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

        dispatchers.sort({ createdAt: 'desc' });
        dispatchers.limit(limit);
        dispatchers.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                dispatchers.populate(e);
            });
        }
        Promise.all([
            Dispatcher.countDocuments(),
            dispatchers.exec()
        ]).then(async (value) => {
            if (value) {
                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        });
    } catch (error) {
        res.send(error);
    };
}

const show = (req, res) => {
    try {
        Dispatcher.findById(req.params.id, (err, dispatcher) => {
            if (err) console.log(err);
            if (dispatcher) {
                console.log({ "dispatcher": dispatcher });
                res.send(dispatcher)
            } else {
                res.status(404).send("Unknown dispatcher");
            }
        });
    } catch (error) {
        res.status(500).send(error);
    };
}

const store = async (req, res) => {
    try {
        if (req.body) {
            const data = req.body;
            console.log({data})
            if (data['password']) {
                data["password"] = await bcrypt.hash(data["password"], 5);
            }
            console.log(data.password);
            const savedDispatcher = await Dispatcher.create(data);
            res.send(savedDispatcher);
        }
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
}

const auth = (req, res) => {
    const data = req.body;
    if (data && data.email && data.password && data.role) {
        Dispatcher.findOne({ email: data.email, roles: data.role }, (err, dispatcher) => {
            if (err) res.status(500).send(err);
            if (dispatcher) {
                if (bcrypt.compare(data.password, dispatcher.password)) {
                    const dispatcherObject = dispatcher.toObject();
                    delete dispatcherObject.password;
                    delete dispatcherObject.roles;
                    res.send({dispatcher: dispatcherObject, role: data.role, token: "token"});
                } else {
                    res.status(401).send({ error: "UNAUTHORIZED" });
                }
            } else {
                res.status(401).send({ error: "UNAUTHORIZED" });
            }
        });
    } else {
        res.status(500).send({ error: "Invalid data" });
    }
}

module.exports = { index, show, store, auth };