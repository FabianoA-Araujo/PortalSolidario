const express = require('express');
const router = express.Router();
const ServiceController = require('../controllers/ServiceController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', ServiceController.getAll);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), ServiceController.create);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), ServiceController.update);

module.exports = router;