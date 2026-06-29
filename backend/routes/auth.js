const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { hashPassword, verifyPassword, generateToken, requireAuth } = require('../middleware/auth');

// POST /api/auth/register - Register a new customer
router.post('/register', async (req, res, next) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Clean phone number
    const cleanPhone = phone.trim();

    // Check if user already exists
    const existingUser = await User.findOne({ phone: cleanPhone });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this phone number already exists' });
    }

    // Create user with hashed password
    const hashedPassword = hashPassword(password);
    const user = new User({
      name,
      phone: cleanPhone,
      password: hashedPassword,
      role: 'customer' // default role
    });

    await user.save();

    // Generate token
    const token = generateToken({
      id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login - Login user (customer or admin)
router.post('/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password are required' });
    }

    const cleanPhone = phone.trim();

    // Find user
    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
    }

    // Verify password
    const isMatch = verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
    }

    // Generate token
    const token = generateToken({
      id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role
    });

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    // req.user contains the decoded token fields
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
