const User = require('../models/User');

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, subscriptionStatus } = req.query;

    let filter = {};
    if (role) filter.role = role;
    if (subscriptionStatus) filter.subscriptionStatus = subscriptionStatus;

    const users = await User.find(filter)
      .populate('selectedCharity')
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

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('selectedCharity');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check authorization - user can only view their own profile unless admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this profile' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    // Check authorization
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    const { name, selectedCharity, donationPercentage } = req.validatedData;

    const updateData = {};
    if (name) updateData.name = name;
    if (selectedCharity) updateData.selectedCharity = selectedCharity;
    if (donationPercentage !== undefined) updateData.donationPercentage = donationPercentage;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('selectedCharity');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (Admin only) — cancels active subscription first
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const Subscription = require('../models/Subscription');

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Cancel any active subscriptions first (item 21)
    await Subscription.updateMany(
      { user: req.params.id, status: 'active' },
      { status: 'cancelled' }
    );

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'User and subscriptions deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private
exports.getUserStats = async (req, res, next) => {
  try {
    const Score = require('../models/Score');
    const Subscription = require('../models/Subscription');
    const Winner = require('../models/Winner');

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const scores = await Score.find({ user: req.params.id }).sort({ date: -1 }).limit(5);
    const subscription = await Subscription.findOne({ user: req.params.id, status: 'active' });
    const wins = await Winner.find({ user: req.params.id, verificationStatus: 'approved' });

    const totalWinnings = wins.reduce((sum, win) => sum + win.prizeAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          subscriptionStatus: user.subscriptionStatus,
          totalDonated: user.totalDonated
        },
        scores: scores.map(s => ({ score: s.score, date: s.date })),
        subscription: subscription ? {
          plan: subscription.plan,
          endDate: subscription.endDate,
          status: subscription.status
        } : null,
        wins: {
          count: wins.length,
          totalWinnings
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
