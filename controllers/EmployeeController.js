const logger = require('../services/logger');
const Employee = require('../models/Employee');

const index = async (req, res) => {
    try {
        var page = 1;
        var skip = 0;
        var limit = 20;
        var nextPage;
        var prevPage;

        var filter = {};

        if (req.query.q != null) {
            filter['name'] =
                { $regex: req.query.q ? req.query.q : "", $options: "i" };
        }

        if (req.query.corporate) {
            filter['corporate'] = req.query.corporate;
        }

        var employees = Employee.find(filter);
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

        employees.sort({ createdAt: 'desc' });
        employees.limit(limit);
        employees.skip(skip);
        if (req.query.populate) {
            var populate = JSON.parse(req.query.populate)
            populate.forEach((e) => {
                employees.populate(e);
            });
        }
        Promise.all([
            Employee.countDocuments(filter),
            employees.exec()
        ]).then(async (value) => {
            if (value) {
                if (((page * limit) <= value[0])) {
                    nextPage = page + 1;
                }

                res.send({ data: value[1], count: value[0], nextPage, prevPage });
            }
        }).catch((error) => {
            logger.error("Employees => " + error.toString());
            res.status(500).send(error);
        });
    } catch (error) {
        logger.error("Employees => " + error.toString());
        res.status(500).send(error);
    };
}

const show = async (req, res) => {
    try {
        var employee = await Employee.findById(req.params.id);
        res.send(employee);
    } catch (error) {
        logger.error("Employee => " + error.toString());
        res.status(500).send(error);
    };
}

const store = async (req, res) => {
    try {
        const data = req.body;
        if (data.name && data.corporate) {
            Employee.create({
                name: data.name,
                corporate: data.corporate
            }, (error, employee) => {
                if (error) {
                    logger.error("Employee => " + error.toString());
                    res.status(500).send(error);
                }
                if (employee) {
                    res.send({ employee });
                }
            })
        } else {
            res.status(500).send("Invalid data")
        }
    } catch (error) {
        logger.error("Employee => " + error.toString());
        res.status(500).send(error);
    }
}

module.exports = { index, store, show };