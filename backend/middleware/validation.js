const { body, validationResult } = require('express-validator');

// Validation rules for booking creation
const validateBooking = [
  body('customerName')
    .trim()
    .notEmpty().withMessage('Customer name is required')
    .isLength({ min: 2 }).withMessage('Customer name must be at least 2 characters long'),
  
  body('customerPhone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9\s\-+\(\)]{8,15}$/).withMessage('Please provide a valid phone number (8-15 digits)'),

  body('serviceId')
    .trim()
    .notEmpty().withMessage('Service selection is required')
    .isIn(['haircut', 'coloring', 'threading', 'facial', 'spa']).withMessage('Invalid service selection'),

  body('serviceName')
    .trim()
    .notEmpty().withMessage('Service name is required'),

  body('date')
    .trim()
    .notEmpty().withMessage('Date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format'),

  body('startMinutes')
    .isInt({ min: 0, max: 1439 }).withMessage('Start minutes must be an integer between 0 and 1439'),

  body('duration')
    .isInt({ min: 1 }).withMessage('Duration must be a positive integer'),

  body('price')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),

  // Middleware function to handle errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMsg = errors.array().map(err => err.msg).join(', ');
      return res.status(400).json({
        success: false,
        message: errorMsg
      });
    }
    next();
  }
];

module.exports = {
  validateBooking
};
