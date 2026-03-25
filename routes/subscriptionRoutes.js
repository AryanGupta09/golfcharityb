const express = require('express');
const {
  createSubscription, getUserSubscription, cancelSubscription,
  getAllSubscriptions, renewSubscription,
  createCheckoutSession, stripeWebhook
} = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Stripe webhook — raw body required (mounted before json parser in server.js)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Stripe checkout session
router.post('/checkout', protect, createCheckoutSession);

// Admin
router.get('/', protect, authorize('admin'), getAllSubscriptions);

// User — specific before parameterized
router.get('/user/:userId', protect, getUserSubscription);
router.post('/', protect, validate('createSubscription'), createSubscription);
router.post('/:id/renew', protect, renewSubscription);
router.delete('/:id', protect, cancelSubscription);

module.exports = router;
