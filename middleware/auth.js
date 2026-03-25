const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ message: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure user.id is set for compatibility
    req.user.id = req.user._id;

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized to access this route' });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `User role '${req.user.role}' is not authorized to access this route` 
      });
    }
    next();
  };
};

// Check if subscription is active — items 5, 6
exports.checkSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.isSubscriptionActive()) {
      const isExpired = user.subscriptionStatus === 'expired' ||
        (user.subscriptionExpiryDate && user.subscriptionExpiryDate < new Date());

      return res.status(403).json({
        message: isExpired
          ? 'Your subscription has expired. Please renew to continue.'
          : 'Subscribe to continue. Active subscription required.',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
