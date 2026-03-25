const mongoose = require('mongoose');

const drawSchema = new mongoose.Schema(
  {
    drawNumber: { type: Number, required: true, unique: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    drawDate: { type: Date, default: Date.now },

    // 5 winning numbers (1-45 each)
    winningNumbers: [{ type: Number, min: 1, max: 45 }],

    // Legacy single number (kept for backward compat)
    winningNumber: { type: Number, min: 1, max: 45, default: null },

    prizePool: { type: Number, required: true, default: 0 },
    jackpotRollover: { type: Number, default: 0 }, // carried from previous draw

    distribution: {
      fiveMatch: {
        percentage: { type: Number, default: 40 },
        amount: { type: Number, default: 0 },
        winners: [mongoose.Schema.Types.ObjectId]
      },
      fourMatch: {
        percentage: { type: Number, default: 35 },
        amount: { type: Number, default: 0 },
        winners: [mongoose.Schema.Types.ObjectId]
      },
      threeMatch: {
        percentage: { type: Number, default: 25 },
        amount: { type: Number, default: 0 },
        winners: [mongoose.Schema.Types.ObjectId]
      }
    },

    // random | algorithmic
    drawMode: { type: String, enum: ['random', 'algorithmic'], default: 'random' },

    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
    totalWinners: { type: Number, default: 0 },
    contributionPerUser: { type: Number, default: 10 } // $ per active subscriber
  },
  { timestamps: true }
);

drawSchema.index({ year: 1, month: 1 });

module.exports = mongoose.model('Draw', drawSchema);
