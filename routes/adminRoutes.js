const express = require('express');
const {
  getAnalytics, getUserManagement, updateUserRole,
  deactivateUserSubscription, getSubscriptionManagement,
  getDrawManagement, getWinnerVerificationQueue, getSystemHealth
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { runRenewalReminder } = require('../services/cronService');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, authorize('admin'));

// Analytics
router.get('/analytics', getAnalytics);
router.get('/health', getSystemHealth);

// User Management
router.get('/users', getUserManagement);
router.put('/users/:id/role', updateUserRole);
router.post('/users/:id/deactivate-subscription', deactivateUserSubscription);

// Subscription Management
router.get('/subscriptions', getSubscriptionManagement);

// Draw Management
router.get('/draws', getDrawManagement);

// Winner Verification
router.get('/winners/queue', getWinnerVerificationQueue);

// Item 22: manually trigger renewal reminder cron
router.post('/trigger-renewal-reminder', async (req, res, next) => {
  try {
    const result = await runRenewalReminder();
    res.status(200).json({
      success: true,
      message: `Renewal reminder sent to ${result.sent} user(s)`,
      data: result
    });
  } catch (error) { next(error); }
});

module.exports = router;
