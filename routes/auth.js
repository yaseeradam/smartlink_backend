const express = require('express');
const { body, validationResult } = require('express-validator');
const { register, login, getMe, resetPassword } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Register
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('role').isIn(['buyer', 'seller', 'rider']).withMessage('Invalid role')
], register);

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').exists().withMessage('Password is required')
], login);

// Check if email or phone exists
router.post('/check-exists', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('phone').notEmpty().withMessage('Phone number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, phone } = req.body;

    // Check if user exists by email or phone
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          message: 'Email already exists',
          errorCode: 'EMAIL_EXISTS'
        });
      }
      if (existingUser.phone === phone) {
        return res.status(400).json({
          message: 'Phone number already exists',
          errorCode: 'PHONE_EXISTS'
        });
      }
    }

    res.json({
      success: true,
      message: 'Email and phone are available'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send OTP
router.post('/send-otp', [
  body('email').isEmail().withMessage('Please include a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in memory (in production, use Redis or database)
    const otpStore = req.app.locals.otpStore || new Map();
    otpStore.set(email, {
      otp,
      expiryTime: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes expiry
    });
    req.app.locals.otpStore = otpStore;

    // TODO: Send email using your email service
    console.log(`OTP for ${email}: ${otp}`);

    res.json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;
    const otpStore = req.app.locals.otpStore || new Map();
    const stored = otpStore.get(email);

    if (!stored) {
      return res.status(400).json({ message: 'OTP not found' });
    }

    if (new Date() > stored.expiryTime) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (stored.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    otpStore.delete(email);
    res.json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset password
router.post('/reset-password', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], resetPassword);

// Get current user
router.get('/me', auth, getMe);

module.exports = router;