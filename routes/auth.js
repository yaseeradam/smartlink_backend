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

// Reset password
router.post('/reset-password', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], resetPassword);

// Get current user
router.get('/me', auth, getMe);

// Reset password
router.post('/reset-password', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password
    user.password = password;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;