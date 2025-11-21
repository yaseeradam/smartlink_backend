const express = require('express');
const { body } = require('express-validator');
const { submitDispute } = require('../controllers/ratingController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, authorize('buyer'), [
  body('orderId').notEmpty(),
  body('disputeType').isIn(['delayed', 'failed', 'damaged', 'wrong_item', 'other']),
  body('description').isLength({ min: 10, max: 1000 })
], submitDispute);

module.exports = router;
