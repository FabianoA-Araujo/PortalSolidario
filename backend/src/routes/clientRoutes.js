const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/ClientController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post('/', ClientController.create);
router.get('/', authMiddleware, roleMiddleware(['ADMIN', 'STAFF', 'SUPERADMIN']), ClientController.getAll);
router.patch('/update-password', authMiddleware, ClientController.updatePassword);
router.patch('/:id/reset-password', authMiddleware, roleMiddleware(['SUPERADMIN']), ClientController.resetPassword);

module.exports = router;