const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/EmployeeController');

router.get('/', employeeController.index);

router.get('/:id', employeeController.show);

router.post('/', employeeController.store);

module.exports = router