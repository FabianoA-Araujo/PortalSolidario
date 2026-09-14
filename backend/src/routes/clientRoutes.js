const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/ClientController');

router.post('/', ClientController.create);
router.get('/', ClientController.getAll);

module.exports = router;