const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Store reset tokens temporarily (in production, use Redis or database)
const resetTokens = new Map();

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Store token (in production, save to database)
    resetTokens.set(email, { token: resetToken, expiry: resetTokenExpiry });

    // In production, send email with reset link
    // For now, return token in response (remove in production)
    res.json({
      success: true,
      message: 'Password reset token generated',
      resetToken, // Remove this in production
      email
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    // Verify token
    const storedData = resetTokens.get(email);
    if (!storedData || storedData.token !== resetToken) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    if (Date.now() > storedData.expiry) {
      resetTokens.delete(email);
      return res.status(400).json({ message: 'Reset token expired' });
    }

    // Update password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    // Clear token
    resetTokens.delete(email);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { forgotPassword, resetPassword };
