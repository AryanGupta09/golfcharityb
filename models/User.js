const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String, required: true, unique: true, lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    // Subscription
    subscriptionStatus: { type: String, enum: ['active', 'inactive', 'expired'], default: 'inactive' },
    subscriptionExpiryDate: { type: Date, default: null },

    // Charity
    selectedCharity: { type: mongoose.Schema.Types.ObjectId, ref: 'Charity', default: null },
    donationPercentage: { type: Number, default: 10, min: 0, max: 100 }, // user can set min 10%
    totalDonated: { type: Number, default: 0 },

    // Draw tracking
    totalDrawsEntered: { type: Number, default: 0 },

    // Misc
    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null }
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isSubscriptionActive = function () {
  return this.subscriptionStatus === 'active' &&
    this.subscriptionExpiryDate &&
    this.subscriptionExpiryDate > new Date();
};

module.exports = mongoose.model('User', userSchema);
