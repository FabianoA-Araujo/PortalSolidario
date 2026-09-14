const express = require('express');
const router = express.Router();
const HolidayController = require('../controllers/HolidayController');

router.post('/', HolidayController.create);
router.get('/', HolidayController.getAll);
router.delete('/:id', HolidayController.delete);

module.exports = router;