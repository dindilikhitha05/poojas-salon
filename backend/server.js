const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

const path = require('path');

// Load environment variables from backend/.env (works regardless of working directory)
dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectDB = require('./config/db');
const bookingsRoutes = require('./routes/bookings');
const authRoutes = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');
const Booking = require('./models/Booking');
const User = require('./models/User');
const { hashPassword } = require('./middleware/auth');

// Initialize app
const app = express();

// Connect Database
connectDB().then(() => {
  // Check if seeding is needed
  seedDataIfNeeded();
  seedAdminUser();
});

// ==========================================
// SECURITY & MIDDLEWARE
// ==========================================

// Helmet for security headers
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Morgan logger
app.use(morgan('dev'));

// Compression
app.use(compression());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// STATIC FILE SERVING (Frontend)
// ==========================================
const frontendPath = path.resolve(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// ==========================================
// ROUTES
// ==========================================
app.use('/api/bookings', bookingsRoutes);
app.use('/api/auth', authRoutes);

// Root Endpoint (Self Health Check)
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running perfectly!' });
});

// Centralized error handler middleware
app.use(errorHandler);

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

// ==========================================
// START SERVER
// ==========================================
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running in mode on port ${PORT}`);
  });
}

module.exports = app;

// Helper Function: Seed demo data if database is empty
async function seedDataIfNeeded() {
  try {
    const count = await Booking.countDocuments();
    if (count === 0) {
      console.log('Database is empty. Seeding initial salon bookings...');
      
      const today = new Date();
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const todayStr = formatDate(today);
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = formatDate(tomorrow);

      const demoBookings = [
        {
          customerName: 'Sophia Loren',
          customerPhone: '9876543210',
          serviceId: 'haircut',
          serviceName: 'Haircut',
          date: todayStr,
          startMinutes: 600, // 10:00 AM
          endMinutes: 645,   // 10:45 AM
          duration: 45,
          price: 50
        },
        {
          customerName: 'Emma Watson',
          customerPhone: '9845612307',
          serviceId: 'coloring',
          serviceName: 'Hair Coloring',
          date: todayStr,
          startMinutes: 840, // 2:00 PM
          endMinutes: 930,   // 3:30 PM
          duration: 90,
          price: 120
        },
        {
          customerName: 'Olivia Wilde',
          customerPhone: '9123456789',
          serviceId: 'facial',
          serviceName: 'Facial',
          date: tomorrowStr,
          startMinutes: 660, // 11:00 AM
          endMinutes: 720,   // 12:00 PM
          duration: 60,
          price: 80
        }
      ];

      await Booking.insertMany(demoBookings);
      console.log('Successfully seeded 3 demo bookings.');
    }
  } catch (error) {
    console.error('Error seeding demo data:', error.message);
  }
}

// Helper Function: Seed default Admin user if none exists
async function seedAdminUser() {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      console.log('No admin users found. Seeding default admin user...');
      const adminPhone = process.env.ADMIN_PHONE || '9999999999';
      const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword';
      
      const adminUser = new User({
        name: 'Pooja (Owner)',
        phone: adminPhone.trim(),
        password: hashPassword(adminPassword),
        role: 'admin'
      });
      
      await adminUser.save();
      console.log(`Successfully seeded default admin user. Phone: ${adminPhone}, Password: ${adminPassword}`);
    }
  } catch (error) {
    console.error('Error seeding default admin user:', error.message);
  }
}
