const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const { findNearbySellers } = require('../services/geoService');

const router = express.Router();

// Advanced product search
router.get('/products', async (req, res) => {
  try {
    const {
      q, // search query
      category,
      minPrice,
      maxPrice,
      rating,
      location,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = req.query;

    let query = { isActive: true };
    let sort = {};

    // Text search
    if (q) {
      query.$text = { $search: q };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Rating filter
    if (rating) {
      query['rating.average'] = { $gte: parseFloat(rating) };
    }

    // Sorting
    switch (sortBy) {
      case 'price_low':
        sort.price = 1;
        break;
      case 'price_high':
        sort.price = -1;
        break;
      case 'rating':
        sort['rating.average'] = -1;
        break;
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'relevance':
      default:
        if (q) {
          sort.score = { $meta: 'textScore' };
        } else {
          sort.createdAt = -1;
        }
        break;
    }

    const products = await Product.find(query)
      .populate('seller', 'name businessName location rating')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    // If location provided, add distance to sellers
    if (location) {
      const [lat, lng] = location.split(',').map(parseFloat);
      // Add distance calculation logic here if needed
    }

    res.json({
      success: true,
      products,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      filters: {
        categories: await Product.distinct('category', { isActive: true }),
        priceRange: await Product.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }
        ])
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search sellers
router.get('/sellers', async (req, res) => {
  try {
    const { q, location, category, page = 1, limit = 20 } = req.query;

    let query = { role: 'seller', isActive: true };

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { businessName: { $regex: q, $options: 'i' } },
        { businessDescription: { $regex: q, $options: 'i' } }
      ];
    }

    if (category) {
      query.businessCategory = category;
    }

    let sellers = await User.find(query)
      .select('name businessName businessDescription location avatar')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Add distance if location provided
    if (location) {
      const [lat, lng] = location.split(',').map(parseFloat);
      sellers = await findNearbySellers(lat, lng);
    }

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      sellers,
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

// Get search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const productSuggestions = await Product.find({
      name: { $regex: q, $options: 'i' },
      isActive: true
    })
    .select('name')
    .limit(5);

    const categorySuggestions = await Product.distinct('category', {
      category: { $regex: q, $options: 'i' },
      isActive: true
    });

    res.json({
      success: true,
      suggestions: {
        products: productSuggestions.map(p => p.name),
        categories: categorySuggestions
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;