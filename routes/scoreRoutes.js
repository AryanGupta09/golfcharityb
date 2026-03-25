const express = require('express');
const {
  addScore, editScore, getUserScores,
  getScoresByUserId, deleteScore, getScoreStats
} = require('../controllers/scoreController');
const { protect, checkSubscription } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Specific routes BEFORE parameterized
// Item 6: score entry requires active subscription
router.post('/', protect, checkSubscription, validate('addScore'), addScore);
router.get('/stats/:userId', protect, getScoreStats);
router.get('/', protect, getUserScores);
router.put('/:id', protect, editScore);
router.get('/:userId', protect, getScoresByUserId);
router.delete('/:id', protect, deleteScore);

module.exports = router;
