const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const FROM = process.env.EMAIL_FROM || 'Golf Charity <noreply@golfcharity.com>';

// Generic send helper
const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`📧 Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`❌ Email failed to ${to}:`, err.message);
    // Don't throw — email failure should not break the main flow
  }
};

// ── Templates ──────────────────────────────────────────────

exports.sendSubscriptionConfirmation = async (user, subscription) => {
  await sendEmail({
    to: user.email,
    subject: '✅ Subscription Confirmed - Golf Charity',
    html: `
      <h2>Welcome, ${user.name}!</h2>
      <p>Your <strong>${subscription.plan}</strong> subscription is now active.</p>
      <p>Amount: <strong>$${subscription.amount}</strong></p>
      <p>Valid until: <strong>${new Date(subscription.endDate).toLocaleDateString()}</strong></p>
      <p>You can now add golf scores and participate in monthly draws.</p>
      <br/><p>— Golf Charity Team</p>
    `
  });
};

exports.sendRenewalReminder = async (user, subscription) => {
  await sendEmail({
    to: user.email,
    subject: '⏰ Subscription Expiring Soon - Golf Charity',
    html: `
      <h2>Hi ${user.name},</h2>
      <p>Your <strong>${subscription.plan}</strong> subscription expires on 
         <strong>${new Date(subscription.endDate).toLocaleDateString()}</strong> (in 3 days).</p>
      <p>Renew now to keep participating in draws and supporting charities.</p>
      <a href="${process.env.FRONTEND_URL}/dashboard/settings" 
         style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
        Renew Subscription
      </a>
      <br/><br/><p>— Golf Charity Team</p>
    `
  });
};

exports.sendDrawResults = async (user, draw) => {
  await sendEmail({
    to: user.email,
    subject: `🎯 Draw #${draw.drawNumber} Results - Golf Charity`,
    html: `
      <h2>Hi ${user.name},</h2>
      <p>Draw <strong>#${draw.drawNumber}</strong> has been completed!</p>
      <p>Winning Numbers: <strong>${draw.winningNumbers.join(', ')}</strong></p>
      <p>Prize Pool: <strong>$${draw.prizePool}</strong></p>
      <p>Check your dashboard to see if you won.</p>
      <a href="${process.env.FRONTEND_URL}/dashboard/winnings"
         style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
        View Results
      </a>
      <br/><br/><p>— Golf Charity Team</p>
    `
  });
};

exports.sendWinnerAlert = async (user, winner, draw) => {
  await sendEmail({
    to: user.email,
    subject: `🏆 Congratulations! You Won Draw #${draw.drawNumber}`,
    html: `
      <h2>🎉 Congratulations, ${user.name}!</h2>
      <p>You matched <strong>${winner.matchCount} numbers</strong> in Draw #${draw.drawNumber}!</p>
      <p>Your prize: <strong>$${winner.prizeAmount.toFixed(2)}</strong></p>
      <p>Please upload your proof of win to claim your prize.</p>
      <a href="${process.env.FRONTEND_URL}/dashboard/winnings"
         style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
        Claim Prize
      </a>
      <br/><br/><p>— Golf Charity Team</p>
    `
  });
};

exports.sendDonationConfirmation = async (user, donation, charity) => {
  await sendEmail({
    to: user.email,
    subject: '💚 Donation Confirmed - Golf Charity',
    html: `
      <h2>Thank you, ${user.name}!</h2>
      <p>Your donation of <strong>$${donation.amount}</strong> to 
         <strong>${charity.name}</strong> has been received.</p>
      <p>Your generosity makes a difference!</p>
      <br/><p>— Golf Charity Team</p>
    `
  });
};
