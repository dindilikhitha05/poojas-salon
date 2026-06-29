const express = require('express');
const router = express.Router();
const { validateBooking } = require('../middleware/validation');
const {
  getAllBookings,
  getBookingsByDate,
  createBooking,
  deleteBooking,
  getStatsDashboard,
  getStatsRevenue
} = require('../controllers/bookingController');

// Stats endpoints (must come before /:id and /date/:date to avoid router confusion)
router.get('/stats/dashboard', getStatsDashboard);
router.get('/stats/revenue', getStatsRevenue);

// Date specific route
router.get('/date/:date', getBookingsByDate);

// General CRUD
router.get('/', getAllBookings);
router.post('/', validateBooking, createBooking);
router.delete('/:id', deleteBooking);

module.exports = router;
