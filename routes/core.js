const express = require('express');
const router = express.Router();
const CoreController = require('../controllers/CoreController');
const { sendNotificationById } = require('../services/notificationService');

router.get('/getSettingsAndVehicleModels', CoreController.getSettingsAndVehicleModels);

router.get('/dashboard', CoreController.dashboard);

router.post('/route', CoreController.route);

router.get('/notification', (req, res) => {
    sendNotificationById("cW4H_tlGQICz4DRkktGy4F:APA91bGwKaB01nsYC-W0K4-1QWiFl8s6VBwrjqxTH8GHuKpt8-AsPMkI0eSlgmm3g8WAN0hRr7tWtCn-PvRTONLkNZcoKxbRZNzYOaVXTA9917slMYWjjoArhn8IBmaoRjj_itGrTTiK", {title: "test title", body: "test body"});
    res.send("done");
})

module.exports = router;