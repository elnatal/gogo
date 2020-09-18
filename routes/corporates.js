const express = require('express');
const router = express.Router();
const CorporateController = require('../controllers/CorporateController');
const AuthMiddleware = require('../middleware/authMiddleware');

router.get('/', CorporateController.index);

router.get('/search', CorporateController.search)

router.get('/:id', CorporateController.show);

router.get('/:id/trips', CorporateController.trips)

router.get('/:id/tickets', CorporateController.tickets)

router.post('/"id/pay', CorporateController.pay);

router.get('/:id/dashboard', CorporateController.dashboard)

router.post('/', CorporateController.store);

router.patch('/:id', CorporateController.update);

router.delete('/:id', CorporateController.remove);

module.exports = router;