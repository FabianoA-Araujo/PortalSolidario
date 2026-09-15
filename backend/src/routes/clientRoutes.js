const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/ClientController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post('/', ClientController.create);
router.get('/', authMiddleware, roleMiddleware(['ADMIN', 'STAFF', 'SUPERADMIN']), ClientController.getAll);

module.exports = router;