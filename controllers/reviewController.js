const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

const createReview = async (req, res) => {
  try {
    const { productId, orderId, rating, comment, images } = req.body;

    // Verify user bought the product
    const order = await Order.findOne({
      _id: orderId,
      buyer: req.user.id,
      status: 'delivered'
    });

    if (!order) {
      return res.status(400).json({ message: 'You can only review products you have purchased' });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user.id,
      order: orderId
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    const review = await Review.create({
      product: productId,
      user: req.user.id,
      order: orderId,
      rating,
      comment,
      images: images || [],
      isVerified: true
    });

    // Update product rating
    await updateProductRating(productId);

    await review.populate('user', 'name avatar');
    res.status(201).json({ success: true, review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, rating } = req.query;
    const query = { product: req.params.productId, isModerated: true };
    
    if (rating) query.rating = rating;

    const reviews = await Review.find(query)
      .populate('user', 'name avatar')
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
};

const updateProductRating = async (productId) => {
  const reviews = await Review.find({ product: productId, isModerated: true });
  
  if (reviews.length > 0) {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await Product.findByIdAndUpdate(productId, {
      'rating.average': Math.round(averageRating * 10) / 10,
      'rating.count': reviews.length
    });
  }
};

const voteHelpful = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { $inc: { helpfulVotes: 1 } },
      { new: true }
    );

    res.json({ success: true, helpfulVotes: review.helpfulVotes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  voteHelpful
};