const express = require('express');
const router = express.Router();
const DriverController = require('../controllers/DriverController');
const AuthMiddleware = require('../middleware/authMiddleware')

router.get('/', DriverController.index);

router.get('/firebase/:firebaseId', DriverController.firebaseAuth);

router.get('/search', DriverController.search);

router.get('/:id', DriverController.show);

router.get('/:id/bookings', DriverController.bookings);

router.get('/:id/wallet-history', DriverController.walletHistory);

router.get('/:id/scheduled-trips', DriverController.scheduledTrips);

router.post('/:id/rate', DriverController.rate);

router.post('/:id/top-up', DriverController.topUp);

router.get('/:id/rents', DriverController.rents);

router.post('/', DriverController.store);

router.patch('/:id', DriverController.update);

router.delete('/:id', DriverController.remove);

module.exports = router;