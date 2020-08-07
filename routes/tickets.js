const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/ticketController');
const AuthMiddleware = require('../middleware/authMiddleware')

router.get('/', TicketController.index);

router.get('/:id', AuthMiddleware([4, 5]), TicketController.show);

router.get('/validate/:key', TicketController.validate);

router.post('/', TicketController.store);

router.patch('/:id', TicketController.update);

router.delete('/:id', TicketController.remove);

module.exports = router;