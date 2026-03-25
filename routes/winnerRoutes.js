const express = require('express');
const {
  getUserWins,
  uploadProof,
  verifyWinner,
  getPendingVerifications,
  processPayment,
  getAllWinners
} = require('../controllers/winnerController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Admin routes - specific routes BEFORE parameterized routes
router.get('/', protect, authorize('admin'), getAllWinners);
router.get('/pending', protect, authorize('admin'), getPendingVerifications);
router.post('/:id/verify', protect, authorize('admin'), validate('verifyWinner'), verifyWinner);
router.post('/:id/process-payment', protect, authorize('admin'), validate('processPayment'), processPayment);

// User routes
router.get('/user/:userId', protect, getUserWins);
router.post('/:id/upload-proof', protect, uploadProof);

module.exports = router;
