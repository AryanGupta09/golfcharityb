const express = require('express');
const {
  getAllUsers,
  getUserById,
  updateProfile,
  deleteUser,
  getUserStats
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Admin routes
router.get('/', protect, authorize('admin'), getAllUsers);
router.delete('/:id', protect, authorize('admin'), deleteUser);

// User routes
router.get('/:id', protect, getUserById);
router.put('/:id', protect, validate('updateProfile'), updateProfile);
router.get('/:id/stats', protect, getUserStats);

module.exports = router;
