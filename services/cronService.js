const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const emailService = require('./emailService');

/**
 * Core logic — find subscriptions expiring in 3 days and send reminder
 * Exported so admin can manually trigger it (item 22)
 */
const runRenewalReminder = async () => {
  console.log('⏰ Running renewal reminder...');
  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const start = new Date(threeDaysFromNow);
    start.setHours(0, 0, 0, 0);
    const end = new Date(threeDaysFromNow);
    end.setHours(23, 59, 59, 999);

    const expiringSubs = await Subscription.find({
      status: 'active',
      endDate: { $gte: start, $lte: end }
    }).populate('user');

    let sent = 0;
    for (const sub of expiringSubs) {
      if (sub.user) {
        await emailService.sendRenewalReminder(sub.user, sub);
        sent++;
        console.log(`📧 Renewal reminder sent to ${sub.user.email}`);
      }
    }
    return { sent, checked: expiringSubs.length };
  } catch (err) {
    console.error('Cron error:', err.message);
    throw err;
  }
};

/**
 * Runs daily at 9am
 */
const startRenewalReminder = () => {
  cron.schedule('0 9 * * *', runRenewalReminder);
  console.log('✅ Renewal reminder cron started');
};

module.exports = { startRenewalReminder, runRenewalReminder };
