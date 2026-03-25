const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    score: {
      type: Number,
      required: [true, 'Please provide a score'],
      min: [1, 'Score must be between 1 and 45'],
      max: [45, 'Score must be between 1 and 45']
    },
    date: {
      type: Date,
      default: Date.now
    },
    courseInfo: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

// Index for efficient queries
scoreSchema.index({ user: 1, date: -1 });

// Static method to add score and keep only last 5 (rolling window)
scoreSchema.statics.addScore = async function (userId, score, date, courseInfo) {
  // Create the new score
  const newScore = await this.create({ user: userId, score, date, courseInfo });

  // Count total scores for this user
  const total = await this.countDocuments({ user: userId });

  // If more than 5, delete all oldest beyond the 5 most recent
  if (total > 5) {
    const keep = await this.find({ user: userId })
      .sort({ date: -1, createdAt: -1 })
      .limit(5)
      .select('_id');
    const keepIds = keep.map(s => s._id);
    await this.deleteMany({ user: userId, _id: { $nin: keepIds } });
  }

  return newScore;
};

module.exports = mongoose.model('Score', scoreSchema);
