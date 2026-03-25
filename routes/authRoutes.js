const express = require('express');
const { signup, login, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/signup', validate('signup'), signup);
router.post('/login', validate('login'), login);

// Private routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
