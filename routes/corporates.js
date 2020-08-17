const express = require('express');
const router = express.Router();
const CorporateController = require('../controllers/CorporateController');
const AuthMiddleware = require('../middleware/authMiddleware');
const { route } = require('./tickets');

router.get('/', CorporateController.index);

router.get('/:id', AuthMiddleware([4, 5]), CorporateController.show);

router.get('/:id/used-tickets', CorporateController.usedTickets)

router.post('/', CorporateController.store);

router.patch('/:id', CorporateController.update);

router.delete('/:id', CorporateController.remove);

module.exports = router;