const express = require('express');
const router = express.Router();
const SettingController = require('../controllers/SettingController');

router.get('/', SettingController.get);

router.post('/', SettingController.add);


module.exports = router;