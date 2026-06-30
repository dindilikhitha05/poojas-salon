const Booking = require('../models/Booking');

// GET /api/bookings - Get all bookings (supports search, pagination, date filter)
const getAllBookings = async (req, res, next) => {
  try {
    const { search, date, page = 1, limit = 20 } = req.query;

    const query = {};

    // 1. Date Filter
    if (date) {
      query.date = date;
    }

    // 2. Search filter (customer name or phone number)
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }

    // 3. Pagination Setup
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with sorting
    const bookings = await Booking.find(query)
      .sort({ date: -1, startMinutes: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings/date/:date - Get bookings for specific date sorted by startMinutes
const getBookingsByDate = async (req, res, next) => {
  try {
    const { date } = req.params;

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    let bookings = await Booking.find({ date }).sort({ startMinutes: 1 });

    // Mask customer details for public checks, only show for owner
    if (!req.isOwner) {
      bookings = bookings.map(b => {
        const obj = b.toObject();
        obj.customerName = 'Reserved';
        obj.customerPhone = 'Reserved';
        return obj;
      });
    }

    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};


// POST /api/bookings - Create booking with overlap conflict detection (409)
const createBooking = async (req, res, next) => {
  try {
    const {
      customerName,
      customerPhone,
      serviceId,
      serviceName,
      date,
      startMinutes,
      duration,
      price
    } = req.body;

    const SALON_START = 11 * 60; // 660  — 11:00 AM
    const SALON_END   = 20 * 60; // 1200 — 8:00 PM

    // 1. Reject Mondays (closed day)
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getDay() === 1) {
      return res.status(400).json({
        success: false,
        message: "We're closed on Mondays — please pick another day"
      });
    }

    // 2. Reject bookings outside business hours (11:00 AM – 8:00 PM)
    const endMinutes = startMinutes + duration;
    if (startMinutes < SALON_START || startMinutes >= SALON_END) {
      return res.status(400).json({
        success: false,
        message: 'Booking must start between 11:00 AM and 8:00 PM'
      });
    }
    if (endMinutes > SALON_END) {
      return res.status(400).json({
        success: false,
        message: 'This service would run past our 8:00 PM closing time. Please choose an earlier slot'
      });
    }

    // 3. Reject invalid phone (exactly 10 digits)
    if (!/^[0-9]{10}$/.test(customerPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      });
    }

    // 4. Double check overlap conflict in MongoDB
    // Overlap formula: start_new < end_existing AND start_existing < end_new
    const overlappingBooking = await Booking.findOne({
      date,
      startMinutes: { $lt: endMinutes },
      endMinutes: { $gt: startMinutes }
    });

    if (overlappingBooking) {
      return res.status(409).json({
        success: false,
        message: `Time slot conflict: Selected time overlaps with an existing booking for ${overlappingBooking.customerName} (${overlappingBooking.serviceName})`
      });
    }

    // 5. Insert booking
    const booking = new Booking({
      customerId: req.user ? req.user.id : null,
      customerName,
      customerPhone,
      serviceId,
      serviceName,
      date,
      startMinutes,
      endMinutes,
      duration,
      price
    });

    const savedBooking = await booking.save();

    res.status(201).json({
      success: true,
      data: savedBooking
    });
  } catch (error) {
    next(error);
  }
};


// DELETE /api/bookings/:id - Delete booking
const deleteBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByIdAndDelete(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings/stats/dashboard - Get total bookings, revenue, service time for specific date
const getStatsDashboard = async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid date parameter (YYYY-MM-DD) is required'
      });
    }

    const bookings = await Booking.find({ date });

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + b.price, 0);
    const totalMinutes = bookings.reduce((sum, b) => sum + b.duration, 0);

    res.status(200).json({
      success: true,
      data: {
        date,
        totalBookings,
        totalRevenue,
        totalMinutes
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings/stats/revenue - Get overall revenue stats
const getStatsRevenue = async (req, res, next) => {
  try {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$price' },
          totalBookings: { $sum: 1 },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);

    const result = stats[0] || { totalRevenue: 0, totalBookings: 0, averagePrice: 0 };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings/my-bookings - Get bookings for the logged-in customer
const getMyBookings = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const bookings = await Booking.find({ customerId }).sort({ date: -1, startMinutes: 1 });
    
    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllBookings,
  getBookingsByDate,
  createBooking,
  deleteBooking,
  getStatsDashboard,
  getStatsRevenue,
  getMyBookings
};
