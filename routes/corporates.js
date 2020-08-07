const express = require('express');
const router = express.Router();
const CorporateController = require('../controllers/corporateController');
const AuthMiddleware = require('../middleware/authMiddleware')

router.get('/', CorporateController.index);

router.get('/:id', AuthMiddleware([4, 5]), CorporateController.show);

router.post('/', CorporateController.store);

router.patch('/:id', CorporateController.update);

router.delete('/:id', CorporateController.remove);

module.exports = router;