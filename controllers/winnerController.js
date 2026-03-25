const Winner = require('../models/Winner');
const User = require('../models/User');
const Charity = require('../models/Charity');

// @desc    Get user's wins
// @route   GET /api/winners/user/:userId
// @access  Private
exports.getUserWins = async (req, res, next) => {
  try {
    // Check authorization
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const wins = await Winner.find({ user: req.params.userId })
      .populate('draw')
      .sort({ createdAt: -1 });

    const totalWinnings = wins.reduce((sum, win) => sum + win.prizeAmount, 0);
    const approvedWins = wins.filter(w => w.verificationStatus === 'approved');

    res.status(200).json({
      success: true,
      data: {
        totalWins: wins.length,
        approvedWins: approvedWins.length,
        totalWinnings,
        wins
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload proof of win
// @route   POST /api/winners/:id/upload-proof
// @access  Private
exports.uploadProof = async (req, res, next) => {
  try {
    const { proofImageUrl } = req.body;

    if (!proofImageUrl) {
      return res.status(400).json({ message: 'Please provide proof image URL' });
    }

    const winner = await Winner.findById(req.params.id);

    if (!winner) {
      return res.status(404).json({ message: 'Winner record not found' });
    }

    // Check authorization
    if (req.user.id !== winner.user.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    winner.proofImageUrl = proofImageUrl;
    winner.verificationStatus = 'pending';
    await winner.save();

    res.status(200).json({
      success: true,
      message: 'Proof uploaded successfully',
      data: winner
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify winner (Admin only)
// @route   POST /api/winners/:id/verify
// @access  Private/Admin
exports.verifyWinner = async (req, res, next) => {
  try {
    const { isApproved, rejectionReason } = req.validatedData;

    const winner = await Winner.findById(req.params.id);

    if (!winner) {
      return res.status(404).json({ message: 'Winner record not found' });
    }

    if (isApproved) {
      winner.verificationStatus = 'approved';
      winner.paymentStatus = 'pending';
    } else {
      winner.verificationStatus = 'rejected';
      winner.rejectionReason = rejectionReason || 'Proof not valid';
    }

    winner.verifiedBy = req.user.id;
    winner.verificationDate = new Date();
    await winner.save();

    res.status(200).json({
      success: true,
      message: `Winner ${isApproved ? 'approved' : 'rejected'} successfully`,
      data: winner
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending verifications (Admin only)
// @route   GET /api/winners/pending
// @access  Private/Admin
exports.getPendingVerifications = async (req, res, next) => {
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

// @desc    Process payment (Admin only)
// @route   POST /api/winners/:id/process-payment
// @access  Private/Admin
exports.processPayment = async (req, res, next) => {
  try {
    const { transactionId } = req.validatedData;

    const winner = await Winner.findById(req.params.id);

    if (!winner) {
      return res.status(404).json({ message: 'Winner record not found' });
    }

    if (winner.verificationStatus !== 'approved') {
      return res.status(400).json({ message: 'Winner must be approved before payment' });
    }

    winner.paymentStatus = 'paid';
    winner.transactionId = transactionId;
    winner.paymentDate = new Date();
    await winner.save();

    // Update user total donated
    const user = await User.findById(winner.user);
    user.totalDonated += winner.prizeAmount;
    await user.save();

    // Update charity total donations
    if (user.selectedCharity) {
      await Charity.findByIdAndUpdate(
        user.selectedCharity,
        { $inc: { totalDonations: winner.prizeAmount } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: winner
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all winners (Admin only)
// @route   GET /api/winners
// @access  Private/Admin
exports.getAllWinners = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, verificationStatus, paymentStatus } = req.query;

    let filter = {};
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const winners = await Winner.find(filter)
      .populate('user', 'name email')
      .populate('draw', 'drawNumber month year')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Winner.countDocuments(filter);

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
