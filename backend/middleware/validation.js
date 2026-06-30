const { body, validationResult } = require('express-validator');

// Business rules (must mirror frontend constants)
const SALON_START_MINUTES = 11 * 60; // 11:00 AM
const SALON_END_MINUTES   = 20 * 60; // 8:00 PM
const CLOSED_DAYS = [1];             // 1 = Monday

// Validation rules for booking creation
const validateBooking = [
  body('customerName')
    .trim()
    .notEmpty().withMessage('Customer name is required')
    .isLength({ min: 2 }).withMessage('Customer name must be at least 2 characters long'),

  body('customerPhone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),

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
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format')
    .custom((value) => {
      // Check for Monday (closed day)
      const [year, month, day] = value.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      if (CLOSED_DAYS.includes(dateObj.getDay())) {
        throw new Error("We're closed on Mondays — please pick another day");
      }
      return true;
    }),

  body('startMinutes')
    .isInt({ min: 0, max: 1439 }).withMessage('Start minutes must be an integer between 0 and 1439')
    .custom((value) => {
      const start = parseInt(value, 10);
      if (start < SALON_START_MINUTES) {
        throw new Error('Booking cannot start before 11:00 AM opening time');
      }
      if (start >= SALON_END_MINUTES) {
        throw new Error('Booking cannot start at or after 8:00 PM closing time');
      }
      return true;
    }),

  body('duration')
    .isInt({ min: 1 }).withMessage('Duration must be a positive integer')
    .custom((value, { req }) => {
      const start    = parseInt(req.body.startMinutes, 10);
      const duration = parseInt(value, 10);
      if (!isNaN(start) && (start + duration) > SALON_END_MINUTES) {
        throw new Error('This service would run past our 8:00 PM closing time. Please choose an earlier slot');
      }
      return true;
    }),

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
