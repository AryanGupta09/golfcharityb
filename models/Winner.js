const mongoose = require('mongoose');

const winnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    draw: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Draw',
      required: true
    },
    matchCount: {
      type: Number,
      required: true,
      enum: [3, 4, 5]
    },
    prizeAmount: {
      type: Number,
      required: true
    },
    proofImageUrl: {
      type: String,
      default: null
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },
    paymentDate: {
      type: Date,
      default: null
    },
    transactionId: {
      type: String,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verificationDate: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Index for efficient queries
winnerSchema.index({ user: 1, draw: 1 });
winnerSchema.index({ verificationStatus: 1 });

module.exports = mongoose.model('Winner', winnerSchema);
