const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/TicketController');
const AuthMiddleware = require('../middleware/authMiddleware')

router.get('/', TicketController.index);

router.get('/:id', AuthMiddleware([4, 5]), TicketController.show);

router.get('/validate/:corporate/:code', TicketController.validate);

router.post('/', TicketController.store);

router.patch('/:id', TicketController.update);

router.delete('/:id', TicketController.remove);

module.exports = router;