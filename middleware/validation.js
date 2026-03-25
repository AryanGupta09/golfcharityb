const Joi = require('joi');

// Future date validator for scores
const notFutureDate = (value, helpers) => {
  if (value > new Date()) {
    return helpers.error('date.future');
  }
  return value;
};

const schemas = {
  // Item 1: duplicate email handled by errorHandler (code 11000)
  signup: Joi.object({
    name: Joi.string().required().min(2).max(50).messages({
      'string.min': 'Name must be at least 2 characters',
      'any.required': 'Name is required'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().min(6).messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required'
    }),
    confirmPassword: Joi.string().required().valid(Joi.ref('password')).messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your password'
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Items 8 + 9: score range + future date
  addScore: Joi.object({
    score: Joi.number().required().min(1).max(45).messages({
      'number.min': 'Score must be between 1 and 45',
      'number.max': 'Score must be between 1 and 45',
      'any.required': 'Score is required'
    }),
    date: Joi.date().default(() => new Date()).custom(notFutureDate).messages({
      'date.future': 'Date cannot be in the future',
      'date.base': 'Invalid date'
    }),
    courseInfo: Joi.string().optional().allow('')
  }),

  createSubscription: Joi.object({
    plan: Joi.string().valid('monthly', 'yearly').required().messages({
      'any.only': 'Plan must be monthly or yearly',
      'any.required': 'Plan is required'
    }),
    charityId: Joi.string().optional()
  }),

  // Item 16: donation percentage min 10%
  updateProfile: Joi.object().keys({
    name: Joi.string().min(2).max(50).optional(),
    selectedCharity: Joi.string().allow('').optional(),
    donationPercentage: Joi.number().min(10).max(100).optional().messages({
      'number.min': 'Minimum contribution is 10%',
      'number.max': 'Maximum contribution is 100%'
    })
  }).unknown(true),

  createCharity: Joi.object({
    name: Joi.string().required().min(2),
    description: Joi.string().required(),
    website: Joi.string().uri().optional().allow(''),
    registrationNumber: Joi.string().optional()
  }),

  verifyWinner: Joi.object({
    isApproved: Joi.boolean().required(),
    rejectionReason: Joi.string().optional()
  }),

  processPayment: Joi.object({
    transactionId: Joi.string().required().min(3)
  }),

  // Item 17: donation amount min $1
  makeDonation: Joi.object({
    amount: Joi.number().required().min(1).messages({
      'number.min': 'Minimum donation is $1',
      'any.required': 'Amount is required'
    }),
    message: Joi.string().optional().allow('')
  })
};

const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) return res.status(500).json({ message: 'Validation schema not found' });

    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({ message: messages[0], errors: messages });
    }
    req.validatedData = value;
    next();
  };
};

module.exports = { validate, schemas };
