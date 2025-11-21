const express = require('express');
const { body } = require('express-validator');
const {
  submitRating,
  getUserRatings,
  submitDispute
} = require('../controllers/ratingController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, authorize('buyer'), [
  body('orderId').notEmpty(),
  body('revieweeId').notEmpty(),
  body('revieweeType').isIn(['seller', 'rider']),
  body('rating').isInt({ min: 1, max: 5 })
], submitRating);

router.get('/:userId', getUserRatings);

module.exports = router;
