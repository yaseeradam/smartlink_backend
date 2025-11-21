const Rating = require('../models/Rating');
const Dispute = require('../models/Dispute');
const Order = require('../models/Order');
const User = require('../models/User');

const submitRating = async (req, res) => {
  try {
    const { orderId, revieweeId, revieweeType, rating, comment } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      buyer: req.user.id,
      status: 'delivered'
    });

    if (!order) {
      return res.status(400).json({ message: 'Order not found or not delivered' });
    }

    const existingRating = await Rating.findOne({
      order: orderId,
      reviewer: req.user.id,
      reviewee: revieweeId
    });

    if (existingRating) {
      return res.status(400).json({ message: 'You have already rated this party' });
    }

    const newRating = await Rating.create({
      order: orderId,
      reviewer: req.user.id,
      reviewee: revieweeId,
      revieweeType,
      rating,
      comment
    });

    await updateUserRating(revieweeId);

    res.status(201).json({ success: true, rating: newRating });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({ reviewee: req.params.userId })
      .populate('reviewer', 'name avatar')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 });

    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    res.json({
      success: true,
      ratings,
      average: Math.round(avgRating * 10) / 10,
      count: ratings.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitDispute = async (req, res) => {
  try {
    const { orderId, disputeType, description } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      buyer: req.user.id
    });

    if (!order) {
      return res.status(400).json({ message: 'Order not found' });
    }

    const dispute = await Dispute.create({
      order: orderId,
      reporter: req.user.id,
      disputeType,
      description
    });

    res.status(201).json({ success: true, dispute });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserRating = async (userId) => {
  const ratings = await Rating.find({ reviewee: userId });
  
  if (ratings.length > 0) {
    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    await User.findByIdAndUpdate(userId, {
      rating: Math.round(avgRating * 10) / 10,
      ratingCount: ratings.length
    });
  }
};

module.exports = {
  submitRating,
  getUserRatings,
  submitDispute
};
