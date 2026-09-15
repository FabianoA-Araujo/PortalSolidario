const express = require('express');
const router = express.Router();
const HolidayController = require('../controllers/HolidayController');

//middleware
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

//passando middlwares junto:
router.get('/', authMiddleware, HolidayController.getAll);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), HolidayController.create);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), HolidayController.delete);

module.exports = router;