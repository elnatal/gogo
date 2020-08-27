const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');

router.post('/topic/:topic', NotificationController.sendByTopic);

router.post('/user/:token', NotificationController.sendByToken);

router.get('/', NotificationController.index);

router.get('/search', NotificationController.search);

module.exports = router;