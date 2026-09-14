const express = require('express');
const router = express.Router();
const AppointmentController = require('../controllers/AppointmentController');

router.post('/', AppointmentController.create);
router.get('/', AppointmentController.getAll);
router.patch('/:id/status', AppointmentController.updateStatus);
router.patch('/:id/staff', AppointmentController.assignStaff);

module.exports = router;