const Account = require('../models/Account');
const bcrypt = require('bcryptjs');
const Token = require('../models/Token');
const { populate } = require('../models/Account');
const logger = require('../services/logger');
require('dotenv/config');

const index = (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var accounts = Account.find();
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

        accounts.sort({ createdAt: 'desc' });
        accounts.limit(limit);
        accounts.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                accounts.populate(e);
            });
        }
        Promise.all([
            Account.countDocuments(),
            accounts.exec()
        ]).then(async (value) => {
            if (value) {
                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        }).catch((error) => {
            logger.error("Account => " + error.toString());
            res.status(500).send(error);
        });
    } catch (error) {
        logger.error("Account => " + error.toString());
        res.status(500).send(error);
    };
}

const show = (req, res) => {
    try {
        Account.findById(req.params.id, (error, account) => {
            if (error) logger.error("Account => " + error.toString());
            if (account) {
                res.send(account)
            } else {
                res.status(404).send("Unknown account");
            }
        });
    } catch (error) {
        logger.error("Account => " + error.toString());
        res.status(500).send(error);
    };
}

const search = (req, res) => {
    try {
        Account.find({
            role: req.query.role ? parseInt(req.query.role) : 2,
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
                    email: {
                        $regex: req.query.q ? req.query.q : "", $options: "i"
                    }
                }
            ]
        }, (error, accounts) => {
            if (error) {
                logger.error("Account => " + error.toString());
                res.status(500).send(error);
            }

            if (accounts) {
                res.send(accounts);
            }
        }).limit(10);
    } catch (error) {
        logger.error("Account => " + error.toString());
        res.status(500).send(error);
    }
}

const store = async (req, res) => {
    try {
        if (req.body) {
            const data = req.body;
            if (data['password']) {
                data["password"] = await bcrypt.hash(data["password"], 5);
            }
            const savedAccount = await Account.create(data);
            res.send(savedAccount);
        }
    } catch (error) {
        logger.error("Account => " + error.toString());
        res.status(500).send(error);
    }
}

const auth = (req, res) => {
    const data = req.body;
    if (data && data.email && data.password && data.role) {
        Account.findOne({ email: data.email, roles: data.role }, async (error, account) => {
            if (error) res.status(500).send(error);
            if (account) {
                if (bcrypt.compare(data.password, account.password)) {
                    const accountObject = account.toObject();
                    delete accountObject.password;
                    delete accountObject.roles;
                    var token = await Token.create({ active: true, account: accountObject._id, role: 3 });
                    res.send({ account: accountObject, role: data.role, token: token._id });
                } else {
                    res.status(401).send({ error: "UNAUTHORIZED" });
                }
            } else {
                res.status(401).send({ error: "UNAUTHORIZED" });
            }
        }).populate("corporate");
    } else {
        res.status(500).send({ error: "Invalid data" });
    }
}

const check = async (req, res) => {
    try {
        const token = await Token.findById(req.params.token);
        if (token && token.active == true && token.account) {
            const accountObject = await Account.findById(token.account).populate("corporate");
            if (accountObject) {
                res.send({ account: accountObject, role: token.role, token: token._id });
            } else {
                res.status(401).send({ error: "UNAUTHORIZED" });
            }
        } else {
            res.status(401).send({ error: "UNAUTHORIZED" });
        }
    } catch (error) {
        logger.error("Account => " + error.toString());
        res.status(500).send(error);
    }
}

const update = async (req, res) => {
    try {
        await Account.updateOne({ '_id': req.params.id }, req.body);
        const account = await Account.findById(req.params.id);
        res.send(account);
    } catch (error) {
        logger.error("Account => " + error.toString());
        res.status(500).send(error);
    }
};

module.exports = { index, show, store, auth, check, search, update };