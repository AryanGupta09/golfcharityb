const mongoose = require('mongoose');

// One-time independent donations (not tied to subscription)
const donationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    charity: { type: mongoose.Schema.Types.ObjectId, ref: 'Charity', required: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'USD' },
    message: { type: String, default: null },
    stripePaymentIntentId: { type: String, default: null },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' }
  },
  { timestamps: true }
);

donationSchema.index({ user: 1, charity: 1 });

module.exports = mongoose.model('Donation', donationSchema);
