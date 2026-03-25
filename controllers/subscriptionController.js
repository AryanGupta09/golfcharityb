const Subscription = require('../models/Subscription');
const User = require('../models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailService = require('../services/emailService');

const PLANS = {
  monthly: { amount: 999, currency: 'usd', label: 'Monthly Plan' },
  yearly:  { amount: 9999, currency: 'usd', label: 'Yearly Plan' }
};

// ── STRIPE CHECKOUT ─────────────────────────────────────────

// @desc  Create Stripe checkout session
// @route POST /api/subscriptions/checkout
// @access Private
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ message: 'Invalid plan' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: PLANS[plan].currency,
          product_data: { name: PLANS[plan].label },
          unit_amount: PLANS[plan].amount
        },
        quantity: 1
      }],
      metadata: { userId: req.user.id.toString(), plan },
      success_url: `${process.env.FRONTEND_URL}/dashboard/settings?payment=success`,
      cancel_url:  `${process.env.FRONTEND_URL}/dashboard/settings?payment=cancelled`
    });

    res.status(200).json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    next(error);
  }
};

// @desc  Stripe webhook — activate subscription after payment
// @route POST /api/subscriptions/webhook
// @access Public (raw body)
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, plan } = session.metadata;

    const startDate = new Date();
    const endDate = new Date();
    if (plan === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
    else endDate.setFullYear(endDate.getFullYear() + 1);

    const subscription = await Subscription.create({
      user: userId, plan,
      amount: PLANS[plan].amount / 100,
      currency: 'USD',
      stripeSubscriptionId: session.id,
      status: 'active', startDate, endDate, renewalDate: endDate,
      paymentMethod: 'stripe', transactionId: session.payment_intent
    });

    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'active', subscriptionExpiryDate: endDate
    });

    const user = await User.findById(userId);
    await emailService.sendSubscriptionConfirmation(user, subscription);
  }

  res.json({ received: true });
};

// ── MANUAL SUBSCRIBE (demo / no real Stripe) ────────────────

// @desc  Create subscription directly (demo mode)
// @route POST /api/subscriptions
// @access Private
exports.createSubscription = async (req, res, next) => {
  try {
    const { plan, charityId } = req.validatedData;
    const userId = req.user.id;
    if (!PLANS[plan]) return res.status(400).json({ message: 'Invalid plan' });

    const startDate = new Date();
    const endDate = new Date();
    if (plan === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
    else endDate.setFullYear(endDate.getFullYear() + 1);

    // Cancel any existing active subscription first
    await Subscription.updateMany({ user: userId, status: 'active' }, { status: 'cancelled' });

    const subscription = await Subscription.create({
      user: userId, plan,
      amount: PLANS[plan].amount / 100,
      currency: 'USD',
      stripeSubscriptionId: `demo_${Date.now()}`,
      status: 'active', startDate, endDate, renewalDate: endDate
    });

    const updateFields = { subscriptionStatus: 'active', subscriptionExpiryDate: endDate };
    if (charityId) updateFields.selectedCharity = charityId;
    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true });

    await emailService.sendSubscriptionConfirmation(updatedUser, subscription);

    res.status(201).json({
      success: true,
      message: 'Subscription activated successfully',
      data: { subscription, user: { subscriptionStatus: updatedUser.subscriptionStatus, subscriptionExpiryDate: updatedUser.subscriptionExpiryDate } }
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get user subscription
// @route GET /api/subscriptions/user/:userId
// @access Private
exports.getUserSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ user: req.params.userId, status: 'active' });
    res.status(200).json({ success: true, data: subscription || null });
  } catch (error) { next(error); }
};

// @desc  Cancel subscription
// @route DELETE /api/subscriptions/:id
// @access Private
exports.cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
    if (req.user.id !== subscription.user.toString() && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not authorized' });

    subscription.status = 'cancelled';
    await subscription.save();
    await User.findByIdAndUpdate(subscription.user, { subscriptionStatus: 'inactive' });

    res.status(200).json({ success: true, message: 'Subscription cancelled' });
  } catch (error) { next(error); }
};

// @desc  Get all subscriptions (Admin)
// @route GET /api/subscriptions
// @access Private/Admin
exports.getAllSubscriptions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = status ? { status } : {};
    const subscriptions = await Subscription.find(filter)
      .populate('user', 'name email')
      .limit(limit * 1).skip((page - 1) * limit).sort({ createdAt: -1 });
    const total = await Subscription.countDocuments(filter);
    res.status(200).json({ success: true, count: subscriptions.length, total, page, pages: Math.ceil(total / limit), data: subscriptions });
  } catch (error) { next(error); }
};

// @desc  Renew subscription
// @route POST /api/subscriptions/:id/renew
// @access Private
exports.renewSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
    if (req.user.id !== subscription.user.toString() && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not authorized' });

    const newEndDate = new Date(subscription.endDate);
    if (subscription.plan === 'monthly') newEndDate.setMonth(newEndDate.getMonth() + 1);
    else newEndDate.setFullYear(newEndDate.getFullYear() + 1);

    subscription.status = 'active';
    subscription.endDate = newEndDate;
    subscription.renewalDate = newEndDate;
    await subscription.save();

    await User.findByIdAndUpdate(subscription.user, { subscriptionStatus: 'active', subscriptionExpiryDate: newEndDate });

    res.status(200).json({ success: true, message: 'Subscription renewed', data: subscription });
  } catch (error) { next(error); }
};
