const express = require('express');
const router = express.Router();
const TripController = require('../controllers/TripController');

router.get('/', TripController.index);

router.get('/latest', TripController.latest);

router.get('/:id', TripController.show);

router.get('/:id/sos', TripController.sos);

router.post('/', TripController.store);

router.post('/:id/cancel', TripController.cancel);

router.post('/:id/end', TripController.end);

router.patch('/:id', TripController.update);

router.delete('/:id', TripController.remove);

router.get('/:id/send-email', TripController.resendEmail);

module.exports = router;