const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'phone', 'location', 'avatar', 'bio', 'businessName', 'businessDescription', 'vehicleType'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    const userObj = user.toObject();
    if (userObj.avatar && !userObj.avatar.startsWith('http')) {
      const protocol = req.protocol;
      const host = req.get('host');
      userObj.avatar = `${protocol}://${host}${userObj.avatar.startsWith('/') ? '' : '/'}${userObj.avatar}`;
    }

    res.json({ success: true, user: userObj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name businessName location avatar bio role');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userObj = user.toObject();
    if (userObj.avatar && !userObj.avatar.startsWith('http')) {
      const protocol = req.protocol;
      const host = req.get('host');
      userObj.avatar = `${protocol}://${host}${userObj.avatar.startsWith('/') ? '' : '/'}${userObj.avatar}`;
    }

    res.json({ success: true, user: userObj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;