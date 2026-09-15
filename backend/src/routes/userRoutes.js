const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post('/', authMiddleware, roleMiddleware(['SUPERADMIN']), UserController.create);
router.get('/', authMiddleware, roleMiddleware(['SUPERADMIN']), UserController.getAll);

module.exports = router;