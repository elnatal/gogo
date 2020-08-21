const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');

router.get('/', UserController.index);

router.get('/auth/:phone', UserController.auth);

router.get('/search', UserController.search);

router.get('/:id', UserController.show);

router.post('/:id/rate', UserController.rate);

router.get('/:id/bookings', UserController.bookings);

router.get('/:id/scheduled-trips', UserController.scheduledTrips);

router.post('/', UserController.store);

router.patch('/:id', UserController.update);

router.delete('/:id', UserController.remove);

module.exports = router;