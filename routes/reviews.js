const express = require('express');
const { body } = require('express-validator');
const {
  createReview,
  getProductReviews,
  voteHelpful
} = require('../controllers/reviewController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Create review (buyers only)
router.post('/', auth, authorize('buyer'), [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').isLength({ min: 10, max: 500 }).withMessage('Comment must be between 10 and 500 characters')
], createReview);

// Get product reviews (public)
router.get('/product/:productId', getProductReviews);

// Vote helpful on review
router.post('/:reviewId/helpful', auth, voteHelpful);

module.exports = router;