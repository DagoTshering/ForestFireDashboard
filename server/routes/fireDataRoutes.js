const express = require('express');
const router = express.Router();
const fireDataController = require('../controllers/fireDataController');

router.get('/', fireDataController.getFireData);

router.get('/fetch-latest', fireDataController.fetchAndSaveLatest);

router.get('/latest', fireDataController.getLatestFromAPI);

router.get('/statistics', fireDataController.getStatistics);

module.exports = router;
