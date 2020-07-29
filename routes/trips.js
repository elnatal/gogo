const express = require('express');
const router = express.Router();
const TripController = require('../controllers/TripController');
const { request, json } = require('express');

router.get('/', TripController.index);


router.get('/latest', TripController.latest);

router.get('/:id', TripController.show);


router.post('/', TripController.store);

router.patch('/:id', TripController.update);

router.delete('/:id', TripController.remove);

module.exports = router;