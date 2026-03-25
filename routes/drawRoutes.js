const express = require('express');
const {
  runDraw, simulateDraw, getAllDraws, getDrawById,
  getLatestDraw, getNextDrawDate
} = require('../controllers/drawController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Admin
router.post('/run', protect, authorize('admin'), runDraw);
router.post('/simulate', protect, authorize('admin'), simulateDraw);

// Public — specific before parameterized
router.get('/latest', getLatestDraw);
router.get('/next-date', getNextDrawDate);
router.get('/', getAllDraws);
router.get('/:id', getDrawById);

module.exports = router;
