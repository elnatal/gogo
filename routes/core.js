const express = require('express');
const router = express.Router();
const CoreController = require('../controllers/CoreController');
const { sendNotificationById } = require('../services/notificationService');

router.get('/getSettingsAndVehicleModels', CoreController.getSettingsAndVehicleModels);

router.get('/dashboard', CoreController.dashboard);

router.get('/godview', CoreController.godview);

router.get('/date', CoreController.date);

router.get('/finance', CoreController.finance);

router.post('/route', CoreController.route);

router.get('/notification', (req, res) => {
    sendNotificationById("d_M4wZKnaNY:APA91bH3uC9hbHVlTvYLZYlbn2ZTIaeM1pBExOd6ZDOgAcCNzR5gBiDT-7wbovWXGQxUiUm1uXuzlcSMBY9VUAslK3aFP-Ow4jjF1ab0F94mSUepI-3BCQeNhWueCIh5U_GGHtSlBJ8e", {title: "test title", body: "test body"});
    res.send("done");
})

module.exports = router;