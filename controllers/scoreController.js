const Score = require('../models/Score');

// @desc  Add score — rolling: keeps only last 5
// @route POST /api/scores
// @access Private
exports.addScore = async (req, res, next) => {
  try {
    const { score, date, courseInfo } = req.validatedData;
    const userId = req.user.id;

    // Use static method which handles rolling logic
    const newScore = await Score.addScore(userId, score, date, courseInfo);

    res.status(201).json({ success: true, message: 'Score added', data: newScore });
  } catch (error) { next(error); }
};

// @desc  Edit a score (user: own scores only | admin: any)
// @route PUT /api/scores/:id
// @access Private
exports.editScore = async (req, res, next) => {
  try {
    const scoreDoc = await Score.findById(req.params.id);
    if (!scoreDoc) return res.status(404).json({ message: 'Score not found' });

    // Authorization check
    if (req.user.id !== scoreDoc.user.toString() && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not authorized to edit this score' });

    const { score, date, courseInfo } = req.body;
    if (score !== undefined) {
      if (score < 1 || score > 45) return res.status(400).json({ message: 'Score must be 1-45' });
      scoreDoc.score = score;
    }
    if (date !== undefined) scoreDoc.date = date;
    if (courseInfo !== undefined) scoreDoc.courseInfo = courseInfo;

    await scoreDoc.save();
    res.status(200).json({ success: true, message: 'Score updated', data: scoreDoc });
  } catch (error) { next(error); }
};

// @desc  Get current user's scores (last 5)
// @route GET /api/scores
// @access Private
exports.getUserScores = async (req, res, next) => {
  try {
    const scores = await Score.find({ user: req.user.id }).sort({ date: -1 }).limit(5);
    res.status(200).json({ success: true, count: scores.length, data: scores });
  } catch (error) { next(error); }
};

// @desc  Get scores by user ID (admin or self)
// @route GET /api/scores/:userId
// @access Private
exports.getScoresByUserId = async (req, res, next) => {
  try {
    if (req.user.id !== req.params.userId && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not authorized' });

    const scores = await Score.find({ user: req.params.userId }).sort({ date: -1 }).limit(5);
    res.status(200).json({ success: true, count: scores.length, data: scores });
  } catch (error) { next(error); }
};

// @desc  Delete a score
// @route DELETE /api/scores/:id
// @access Private
exports.deleteScore = async (req, res, next) => {
  try {
    const score = await Score.findById(req.params.id);
    if (!score) return res.status(404).json({ message: 'Score not found' });
    if (req.user.id !== score.user.toString() && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not authorized' });

    await Score.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Score deleted' });
  } catch (error) { next(error); }
};

// @desc  Get score stats for a user
// @route GET /api/scores/stats/:userId
// @access Private
exports.getScoreStats = async (req, res, next) => {
  try {
    if (req.user.id !== req.params.userId && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not authorized' });

    const scores = await Score.find({ user: req.params.userId });
    if (!scores.length)
      return res.status(200).json({ success: true, data: { count: 0, average: 0, highest: 0, lowest: 0, recentScores: [] } });

    const vals = scores.map(s => s.score);
    res.status(200).json({
      success: true,
      data: {
        count: scores.length,
        average: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2),
        highest: Math.max(...vals),
        lowest: Math.min(...vals),
        recentScores: scores.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
      }
    });
  } catch (error) { next(error); }
};
