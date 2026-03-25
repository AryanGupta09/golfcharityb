const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Draw = require('../models/Draw');
const Winner = require('../models/Winner');
const Charity = require('../models/Charity');

// @desc    Get dashboard analytics (Admin only)
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getAnalytics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const totalSubscriptions = await Subscription.countDocuments();
    const totalDraws = await Draw.countDocuments({ status: 'completed' });
    const totalWinners = await Winner.countDocuments({ verificationStatus: 'approved' });
    const totalCharities = await Charity.countDocuments({ isActive: true });

    // Calculate total prize pool
    const draws = await Draw.find({ status: 'completed' });
    const totalPrizePool = draws.reduce((sum, draw) => sum + draw.prizePool, 0);

    // Calculate total donations
    const winners = await Winner.find({ paymentStatus: 'paid' });
    const totalDonations = winners.reduce((sum, winner) => sum + winner.prizeAmount, 0);

    // Get subscription breakdown
    const subscriptionBreakdown = await Subscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]);

    // Get top charities
    const topCharities = await Charity.find()
      .sort({ totalDonations: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          activeSubscriptions,
          totalSubscriptions
        },
        draws: {
          total: totalDraws,
          totalPrizePool,
          totalWinners
        },
        charities: {
          total: totalCharities,
          totalDonations,
          topCharities: topCharities.map(c => ({
            name: c.name,
            donations: c.totalDonations,
            donors: c.donorCount
          }))
        },
        subscriptionBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user management data (Admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUserManagement = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, subscriptionStatus } = req.query;

    let filter = {};
    if (role) filter.role = role;
    if (subscriptionStatus) filter.subscriptionStatus = subscriptionStatus;

    const users = await User.find(filter)
      .populate('selectedCharity', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role (Admin only)
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate user subscription (Admin only)
// @route   POST /api/admin/users/:id/deactivate-subscription
// @access  Private/Admin
exports.deactivateUserSubscription = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        subscriptionStatus: 'inactive',
        subscriptionExpiryDate: null
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User subscription deactivated',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get subscription management (Admin only)
// @route   GET /api/admin/subscriptions
// @access  Private/Admin
exports.getSubscriptionManagement = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    let filter = {};
    if (status) filter.status = status;

    const subscriptions = await Subscription.find(filter)
      .populate('user', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Subscription.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: subscriptions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get draw management (Admin only)
// @route   GET /api/admin/draws
// @access  Private/Admin
exports.getDrawManagement = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const draws = await Draw.find()
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Draw.countDocuments();

    res.status(200).json({
      success: true,
      count: draws.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: draws
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get winner verification queue (Admin only)
// @route   GET /api/admin/winners/queue
// @access  Private/Admin
exports.getWinnerVerificationQueue = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const winners = await Winner.find({ verificationStatus: 'pending' })
      .populate('user', 'name email')
      .populate('draw', 'drawNumber month year winningNumber')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: 1 });

    const total = await Winner.countDocuments({ verificationStatus: 'pending' });

    res.status(200).json({
      success: true,
      count: winners.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: winners
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system health (Admin only)
// @route   GET /api/admin/health
// @access  Private/Admin
exports.getSystemHealth = async (req, res, next) => {
  try {
    const dbStatus = 'connected'; // Would check actual DB connection
    const userCount = await User.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const pendingVerifications = await Winner.countDocuments({ verificationStatus: 'pending' });

    res.status(200).json({
      success: true,
      data: {
        database: dbStatus,
        users: userCount,
        activeSubscriptions,
        pendingVerifications,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};
