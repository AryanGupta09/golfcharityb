const Charity = require('../models/Charity');
const Donation = require('../models/Donation');
const User = require('../models/User');
const emailService = require('../services/emailService');

// @desc  Create charity
// @route POST /api/charities
// @access Private/Admin
exports.createCharity = async (req, res, next) => {
  try {
    const charity = await Charity.create(req.validatedData);
    res.status(201).json({ success: true, message: 'Charity created', data: charity });
  } catch (error) { next(error); }
};

// @desc  Get all charities
// @route GET /api/charities
// @access Public
exports.getAllCharities = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const charities = await Charity.find(filter)
      .limit(limit * 1).skip((page - 1) * limit).sort({ createdAt: -1 });
    const total = await Charity.countDocuments(filter);

    res.status(200).json({ success: true, count: charities.length, total, page: parseInt(page), pages: Math.ceil(total / limit), data: charities });
  } catch (error) { next(error); }
};

// @desc  Get featured charity
// @route GET /api/charities/featured
// @access Public
exports.getFeaturedCharity = async (req, res, next) => {
  try {
    const charity = await Charity.findOne({ isFeatured: true, isActive: true });
    res.status(200).json({ success: true, data: charity || null });
  } catch (error) { next(error); }
};

// @desc  Get charity by ID
// @route GET /api/charities/:id
// @access Public
exports.getCharityById = async (req, res, next) => {
  try {
    const charity = await Charity.findById(req.params.id);
    if (!charity) return res.status(404).json({ message: 'Charity not found' });
    res.status(200).json({ success: true, data: charity });
  } catch (error) { next(error); }
};

// @desc  Update charity
// @route PUT /api/charities/:id
// @access Private/Admin
exports.updateCharity = async (req, res, next) => {
  try {
    const charity = await Charity.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!charity) return res.status(404).json({ message: 'Charity not found' });
    res.status(200).json({ success: true, message: 'Charity updated', data: charity });
  } catch (error) { next(error); }
};

// @desc  Delete charity
// @route DELETE /api/charities/:id
// @access Private/Admin
exports.deleteCharity = async (req, res, next) => {
  try {
    const charity = await Charity.findByIdAndDelete(req.params.id);
    if (!charity) return res.status(404).json({ message: 'Charity not found' });
    res.status(200).json({ success: true, message: 'Charity deleted' });
  } catch (error) { next(error); }
};

// @desc  Set featured charity (unsets all others first)
// @route PUT /api/charities/:id/feature
// @access Private/Admin
exports.setFeaturedCharity = async (req, res, next) => {
  try {
    await Charity.updateMany({}, { isFeatured: false });
    const charity = await Charity.findByIdAndUpdate(req.params.id, { isFeatured: true }, { new: true });
    if (!charity) return res.status(404).json({ message: 'Charity not found' });
    res.status(200).json({ success: true, message: 'Featured charity updated', data: charity });
  } catch (error) { next(error); }
};

// @desc  Add event to charity
// @route POST /api/charities/:id/events
// @access Private/Admin
exports.addEvent = async (req, res, next) => {
  try {
    const charity = await Charity.findById(req.params.id);
    if (!charity) return res.status(404).json({ message: 'Charity not found' });
    charity.events.push(req.body);
    await charity.save();
    res.status(201).json({ success: true, message: 'Event added', data: charity });
  } catch (error) { next(error); }
};

// @desc  Delete event from charity
// @route DELETE /api/charities/:id/events/:eventId
// @access Private/Admin
exports.deleteEvent = async (req, res, next) => {
  try {
    const charity = await Charity.findById(req.params.id);
    if (!charity) return res.status(404).json({ message: 'Charity not found' });
    charity.events = charity.events.filter(e => e._id.toString() !== req.params.eventId);
    await charity.save();
    res.status(200).json({ success: true, message: 'Event deleted', data: charity });
  } catch (error) { next(error); }
};

// @desc  Get charity stats
// @route GET /api/charities/:id/stats
// @access Public
exports.getCharityStats = async (req, res, next) => {
  try {
    const charity = await Charity.findById(req.params.id);
    if (!charity) return res.status(404).json({ message: 'Charity not found' });
    const donors = await User.countDocuments({ selectedCharity: req.params.id });
    const donations = await Donation.aggregate([
      { $match: { charity: charity._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    res.status(200).json({
      success: true,
      data: {
        charity: { name: charity.name, description: charity.description, totalDonations: charity.totalDonations },
        stats: {
          donorCount: donors,
          totalDonations: charity.totalDonations,
          oneTimeDonations: donations[0]?.total || 0,
          oneTimeDonationCount: donations[0]?.count || 0
        }
      }
    });
  } catch (error) { next(error); }
};

// @desc  Make one-time donation to a charity
// @route POST /api/charities/:id/donate
// @access Private
exports.makeDonation = async (req, res, next) => {
  try {
    const { amount, message } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ message: 'Amount must be at least $1' });

    const charity = await Charity.findById(req.params.id);
    if (!charity) return res.status(404).json({ message: 'Charity not found' });

    const donation = await Donation.create({
      user: req.user.id, charity: charity._id, amount, message, status: 'completed'
    });

    // Update charity total
    charity.totalDonations += amount;
    await charity.save();

    // Update user total donated
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalDonated: amount } });

    const user = await User.findById(req.user.id);
    await emailService.sendDonationConfirmation(user, donation, charity);

    res.status(201).json({ success: true, message: 'Donation successful', data: donation });
  } catch (error) { next(error); }
};
