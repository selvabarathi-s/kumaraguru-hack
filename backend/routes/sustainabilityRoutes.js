const express = require('express');
const sustainabilityController = require('../controllers/sustainabilityController');

const router = express.Router();

// IMPORTANT: /scores/trends must come BEFORE /scores/:region
// otherwise Express matches "trends" as the :region parameter
router.get('/scores', sustainabilityController.getSustainabilityScores);
router.get('/scores/trends', sustainabilityController.getTrendAnalysis);
router.post('/scores/recalculate', sustainabilityController.recalculateScores);
router.get('/scores/:region', sustainabilityController.getRegionScore);

module.exports = router;
