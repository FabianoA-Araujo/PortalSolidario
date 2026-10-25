const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post('/', authMiddleware, roleMiddleware(['SUPERADMIN']), UserController.create);
router.get('/', authMiddleware, roleMiddleware(['SUPERADMIN']), UserController.getAll);
router.patch('/:id/role', authMiddleware, roleMiddleware(['SUPERADMIN']), UserController.updateRole);
router.patch('/:id/reset-password', authMiddleware, roleMiddleware(['SUPERADMIN']), UserController.resetPassword);
router.patch('/update-password', authMiddleware, UserController.updatePassword);

module.exports = router;