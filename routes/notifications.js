const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user notifications
router.get('/', auth, getNotifications);

// Mark notifications as read
router.put('/read', auth, markAsRead);

// Mark all notifications as read
router.put('/read-all', auth, markAllAsRead);

module.exports = router;