const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Get all users with pagination
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status } = req.query;
    
    let query = {};
    if (role) query.role = role;
    if (status) query.isActive = status === 'active';

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle user status
router.put('/users/:id/toggle-status', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, message: 'User status updated', isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all products for moderation
router.get('/products', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    let query = {};
    if (status) query.isActive = status === 'active';

    const products = await Product.find(query)
      .populate('seller', 'name businessName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle product status
router.put('/products/:id/toggle-status', adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.json({ success: true, message: 'Product status updated', isActive: product.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all orders
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    let query = {};
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('buyer', 'name email')
      .populate('seller', 'name businessName')
      .populate('rider', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Moderate reviews
router.get('/reviews', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, moderated } = req.query;
    
    let query = {};
    if (moderated !== undefined) query.isModerated = moderated === 'true';

    const reviews = await Review.find(query)
      .populate('user', 'name')
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      reviews,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve/reject review
router.put('/reviews/:id/moderate', adminAuth, async (req, res) => {
  try {
    const { approved } = req.body;
    
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isModerated: approved },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ success: true, message: 'Review moderated', review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;