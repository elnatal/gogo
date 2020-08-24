const express = require('express');
const router = express.Router();

module.exports = (io) => {
    const SOSController = require('../controllers/SOSController')(io);

    router.get('/', SOSController.index);

    router.get('/:id', SOSController.show);

    router.post('/', SOSController.store);

    return router;
}