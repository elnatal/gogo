const express = require('express');
const router = express.Router();
const DriverController = require('../controllers/DriverController');
const AuthMiddleware = require('../middleware/authMiddleware')

router.get('/', DriverController.index);

router.get('/firebase/:firebaseId', DriverController.firebaseAuth);

router.get('/:id', AuthMiddleware([4, 5]), DriverController.show);

router.get('/:id/bookings', DriverController.bookings);

router.post('/', DriverController.store);

router.patch('/:id', DriverController.update);

router.delete('/:id', DriverController.remove);

module.exports = router;