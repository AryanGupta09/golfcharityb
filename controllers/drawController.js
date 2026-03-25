const Draw = require('../models/Draw');
const Score = require('../models/Score');
const Winner = require('../models/Winner');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const emailService = require('../services/emailService');

const CONTRIBUTION_PER_USER = 10; // $10 per active subscriber

// ── HELPERS ─────────────────────────────────────────────────

/**
 * Generate 5 random numbers (1-45, no duplicates)
 */
function generateRandomNumbers() {
  const nums = new Set();
  while (nums.size < 5) nums.add(Math.floor(Math.random() * 45) + 1);
  return [...nums];
}

/**
 * Algorithmic mode: weight numbers by frequency across all user scores.
 * Picks numbers that appear most/least frequently (balanced approach).
 */
async function generateAlgorithmicNumbers() {
  const scores = await Score.find({});
  const freq = {};
  for (let i = 1; i <= 45; i++) freq[i] = 0;
  scores.forEach(s => { if (freq[s.score] !== undefined) freq[s.score]++; });

  // Sort by frequency descending, pick top 3 + 2 least frequent
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const top3 = sorted.slice(0, 3).map(e => parseInt(e[0]));
  const bottom2 = sorted.slice(-2).map(e => parseInt(e[0]));
  const nums = [...new Set([...top3, ...bottom2])];
  // Ensure exactly 5
  while (nums.length < 5) {
    const r = Math.floor(Math.random() * 45) + 1;
    if (!nums.includes(r)) nums.push(r);
  }
  return nums.slice(0, 5);
}

/**
 * Count how many of a user's scores match the winning numbers
 */
function countMatches(userScores, winningNumbers) {
  const winSet = new Set(winningNumbers);
  const userNums = userScores.map(s => s.score);
  return userNums.filter(n => winSet.has(n)).length;
}

/**
 * Find all winners across all active subscribers
 */
async function findWinners(winningNumbers) {
  const activeSubscriptions = await Subscription.find({ status: 'active' }).select('user');
  const userIds = activeSubscriptions.map(s => s.user);

  const fiveMatch = [], fourMatch = [], threeMatch = [];

  for (const userId of userIds) {
    const scores = await Score.find({ user: userId }).sort({ date: -1 }).limit(5);
    if (!scores.length) continue;
    const matches = countMatches(scores, winningNumbers);
    if (matches >= 5) fiveMatch.push(userId);
    else if (matches === 4) fourMatch.push(userId);
    else if (matches === 3) threeMatch.push(userId);
  }

  return { fiveMatch, fourMatch, threeMatch };
}

/**
 * Calculate prize distribution with jackpot rollover support
 */
function calcDistribution(prizePool, jackpotRollover, winners) {
  const jackpotPool = prizePool * 0.40 + jackpotRollover;
  const fourPool    = prizePool * 0.35;
  const threePool   = prizePool * 0.25;

  return {
    fiveMatch:  { percentage: 40, amount: jackpotPool, winners: winners.fiveMatch },
    fourMatch:  { percentage: 35, amount: fourPool,    winners: winners.fourMatch },
    threeMatch: { percentage: 25, amount: threePool,   winners: winners.threeMatch }
  };
}

// ── CONTROLLERS ─────────────────────────────────────────────

// @desc  Run official monthly draw
// @route POST /api/draws/run
// @access Private/Admin
exports.runDraw = async (req, res, next) => {
  try {
    const { mode = 'random' } = req.body;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Prevent duplicate draw for same month
    const existing = await Draw.findOne({ month, year, status: 'completed' });
    if (existing) return res.status(400).json({ message: 'Draw already completed for this month' });

    // Auto-calculate prize pool
    const activeSubs = await Subscription.find({ status: 'active' });
    const prizePool = activeSubs.length * CONTRIBUTION_PER_USER;

    // Get jackpot rollover from last draw (if no 5-match winner)
    const lastDraw = await Draw.findOne({ status: 'completed' }).sort({ createdAt: -1 });
    const jackpotRollover = (lastDraw && lastDraw.distribution.fiveMatch.winners.length === 0)
      ? lastDraw.distribution.fiveMatch.amount : 0;

    // Generate winning numbers
    const winningNumbers = mode === 'algorithmic'
      ? await generateAlgorithmicNumbers()
      : generateRandomNumbers();

    // Find winners
    const winners = await findWinners(winningNumbers);
    const distribution = calcDistribution(prizePool, jackpotRollover, winners);

    const drawNumber = (lastDraw?.drawNumber || 0) + 1;

    const draw = await Draw.create({
      drawNumber, month, year,
      winningNumbers,
      winningNumber: winningNumbers[0], // legacy compat
      prizePool, jackpotRollover, distribution,
      drawMode: mode, status: 'completed',
      totalWinners: winners.fiveMatch.length + winners.fourMatch.length + winners.threeMatch.length,
      contributionPerUser: CONTRIBUTION_PER_USER
    });

    // Create winner records (split prize equally within each tier)
    await createWinnerRecords(draw, winners, distribution);

    // Increment draw count for all participants
    await User.updateMany(
      { _id: { $in: activeSubs.map(s => s.user) } },
      { $inc: { totalDrawsEntered: 1 } }
    );

    // Send emails
    const allParticipants = await User.find({ _id: { $in: activeSubs.map(s => s.user) } });
    for (const u of allParticipants) {
      await emailService.sendDrawResults(u, draw);
    }
    // Winner-specific emails
    const allWinnerIds = [...winners.fiveMatch, ...winners.fourMatch, ...winners.threeMatch];
    const winnerDocs = await Winner.find({ draw: draw._id });
    for (const wDoc of winnerDocs) {
      const u = await User.findById(wDoc.user);
      if (u) await emailService.sendWinnerAlert(u, wDoc, draw);
    }

    res.status(201).json({
      success: true,
      message: 'Draw completed successfully',
      data: {
        draw,
        winningNumbers,
        jackpotRolledOver: winners.fiveMatch.length === 0,
        winners: {
          fiveMatch: winners.fiveMatch.length,
          fourMatch: winners.fourMatch.length,
          threeMatch: winners.threeMatch.length
        }
      }
    });
  } catch (error) { next(error); }
};

// @desc  Simulate draw (dry run — does NOT save to DB)
// @route POST /api/draws/simulate
// @access Private/Admin
exports.simulateDraw = async (req, res, next) => {
  try {
    const { mode = 'random' } = req.body;

    const activeSubs = await Subscription.find({ status: 'active' });
    const prizePool = activeSubs.length * CONTRIBUTION_PER_USER;

    const lastDraw = await Draw.findOne({ status: 'completed' }).sort({ createdAt: -1 });
    const jackpotRollover = (lastDraw && lastDraw.distribution.fiveMatch.winners.length === 0)
      ? lastDraw.distribution.fiveMatch.amount : 0;

    const winningNumbers = mode === 'algorithmic'
      ? await generateAlgorithmicNumbers()
      : generateRandomNumbers();

    const winners = await findWinners(winningNumbers);
    const distribution = calcDistribution(prizePool, jackpotRollover, winners);

    // Populate winner names for preview
    const populate = async (ids) => {
      const users = await User.find({ _id: { $in: ids } }).select('name email');
      return users;
    };

    res.status(200).json({
      success: true,
      simulation: true,
      message: 'Simulation complete — NOT saved to database',
      data: {
        winningNumbers,
        prizePool,
        jackpotRollover,
        distribution: {
          fiveMatch: { amount: distribution.fiveMatch.amount, winners: await populate(winners.fiveMatch) },
          fourMatch: { amount: distribution.fourMatch.amount, winners: await populate(winners.fourMatch) },
          threeMatch: { amount: distribution.threeMatch.amount, winners: await populate(winners.threeMatch) }
        }
      }
    });
  } catch (error) { next(error); }
};

// @desc  Get next draw date (1st of next month)
// @route GET /api/draws/next-date
// @access Public
exports.getNextDrawDate = async (req, res, next) => {
  try {
    const now = new Date();
    const nextDraw = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    res.status(200).json({ success: true, data: { nextDrawDate: nextDraw } });
  } catch (error) { next(error); }
};

// @desc  Get latest completed draw
// @route GET /api/draws/latest
// @access Public
exports.getLatestDraw = async (req, res, next) => {
  try {
    const draw = await Draw.findOne({ status: 'completed' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: draw || null });
  } catch (error) { next(error); }
};

// @desc  Get all draws
// @route GET /api/draws
// @access Public
exports.getAllDraws = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, year, month } = req.query;
    const filter = { status: 'completed' };
    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);

    const draws = await Draw.find(filter)
      .limit(limit * 1).skip((page - 1) * limit).sort({ year: -1, month: -1 });
    const total = await Draw.countDocuments(filter);

    res.status(200).json({ success: true, count: draws.length, total, page, pages: Math.ceil(total / limit), data: draws });
  } catch (error) { next(error); }
};

// @desc  Get draw by ID
// @route GET /api/draws/:id
// @access Public
exports.getDrawById = async (req, res, next) => {
  try {
    const draw = await Draw.findById(req.params.id);
    if (!draw) return res.status(404).json({ message: 'Draw not found' });
    res.status(200).json({ success: true, data: draw });
  } catch (error) { next(error); }
};

// ── PRIVATE HELPER ───────────────────────────────────────────

async function createWinnerRecords(draw, winners, distribution) {
  const records = [];

  const addRecords = (userIds, matchCount, totalAmount) => {
    if (!userIds.length) return;
    const share = totalAmount / userIds.length; // split equally
    userIds.forEach(userId => records.push({ user: userId, draw: draw._id, matchCount, prizeAmount: share }));
  };

  addRecords(winners.fiveMatch, 5, distribution.fiveMatch.amount);
  addRecords(winners.fourMatch, 4, distribution.fourMatch.amount);
  addRecords(winners.threeMatch, 3, distribution.threeMatch.amount);

  if (records.length) await Winner.insertMany(records);
}
