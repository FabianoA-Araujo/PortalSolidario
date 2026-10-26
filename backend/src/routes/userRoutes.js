const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Rota pública para a tela de login apresentar os contatos para reset de senhas
router.get('/contacts', UserController.getAdminContacts);

router.post('/', authMiddleware, roleMiddleware(['SUPERADMIN']), UserController.create);
router.get('/', authMiddleware, roleMiddleware(['SUPERADMIN', 'ADMIN']), UserController.getAll);
router.patch('/:id/role', authMiddleware, roleMiddleware(['SUPERADMIN']), UserController.updateRole);
router.patch('/:id/reset-password', authMiddleware, roleMiddleware(['SUPERADMIN']), UserController.resetPassword);
router.patch('/update-password', authMiddleware, UserController.updatePassword);

module.exports = router;