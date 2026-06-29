const express = require('express');
const router = express.Router();
const { validateBooking } = require('../middleware/validation');
const { requireAuth, requireAdmin, checkAuthOptional } = require('../middleware/auth');
const {
  getAllBookings,
  getBookingsByDate,
  createBooking,
  deleteBooking,
  getStatsDashboard,
  getStatsRevenue,
  getMyBookings
} = require('../controllers/bookingController');

// Customer specific route
router.get('/my-bookings', requireAuth, getMyBookings);

// Stats endpoints (must come before /:id and /date/:date to avoid router confusion) - admin only
router.get('/stats/dashboard', requireAdmin, getStatsDashboard);
router.get('/stats/revenue', requireAdmin, getStatsRevenue);

// Date specific route - optional auth to check if we need to mask personal data
router.get('/date/:date', checkAuthOptional, getBookingsByDate);

// General CRUD
router.get('/', requireAdmin, getAllBookings);
router.post('/', checkAuthOptional, validateBooking, createBooking);
router.delete('/:id', requireAdmin, deleteBooking);

module.exports = router;

