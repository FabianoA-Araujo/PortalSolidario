const express = require('express');
const router = express.Router();
const AppointmentController = require('../controllers/AppointmentController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', authMiddleware, AppointmentController.getAll);
router.post('/', authMiddleware, AppointmentController.create);
router.patch('/:id/status', authMiddleware, AppointmentController.updateStatus);
router.patch('/:id/staff', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), AppointmentController.assignStaff);

module.exports = router;