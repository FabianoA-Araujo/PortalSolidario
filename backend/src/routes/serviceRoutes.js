const express = require('express');
const router = express.Router();
const ServiceController = require('../controllers/ServiceController');

router.post('/', ServiceController.create);
router.get('/', ServiceController.getAll);
router.put('/:id', ServiceController.update);

module.exports = router;