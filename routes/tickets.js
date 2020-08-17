const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/TicketController');
const AuthMiddleware = require('../middleware/authMiddleware')

router.get('/', TicketController.index);

router.get('/:id', AuthMiddleware([4, 5]), TicketController.show);

router.get('/validate/:code', TicketController.validate);

router.get('/generate/:id', TicketController.generate);

router.patch('/:id', TicketController.update);

router.delete('/:id', TicketController.remove);

module.exports = router;