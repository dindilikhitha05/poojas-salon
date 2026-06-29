const express = require('express');
const router = express.Router();
const { validateBooking } = require('../middleware/validation');
const { requireAuth, checkAuthOptional } = require('../middleware/auth');
const {
  getAllBookings,
  getBookingsByDate,
  createBooking,
  deleteBooking,
  getStatsDashboard,
  getStatsRevenue
} = require('../controllers/bookingController');

// Stats endpoints (must come before /:id and /date/:date to avoid router confusion)
router.get('/stats/dashboard', requireAuth, getStatsDashboard);
router.get('/stats/revenue', requireAuth, getStatsRevenue);

// Date specific route - optional auth to check if we need to mask personal data
router.get('/date/:date', checkAuthOptional, getBookingsByDate);

// General CRUD
router.get('/', requireAuth, getAllBookings);
router.post('/', validateBooking, createBooking);
router.delete('/:id', requireAuth, deleteBooking);

module.exports = router;

