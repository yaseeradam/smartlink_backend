const express = require('express');
const {
  getSellerAnalytics,
  getRiderAnalytics,
  getAdminAnalytics
} = require('../controllers/analyticsController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Seller analytics
router.get('/seller', auth, authorize('seller'), getSellerAnalytics);

// Rider analytics
router.get('/rider', auth, authorize('rider'), getRiderAnalytics);

// Admin analytics (future admin role)
router.get('/admin', auth, getAdminAnalytics);

module.exports = router;