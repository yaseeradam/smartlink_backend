const express = require('express');
const { body } = require('express-validator');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  assignRider
} = require('../controllers/orderController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Create order (buyers only)
router.post('/', auth, authorize('buyer'), [
  body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  body('deliveryAddress').notEmpty().withMessage('Delivery address is required')
], createOrder);

// Get orders (role-based)
router.get('/', auth, getOrders);

// Get single order
router.get('/:id', auth, getOrder);

// Update order status (sellers and riders)
router.put('/:id/status', auth, authorize('seller', 'rider'), [
  body('status').notEmpty().withMessage('Status is required')
], updateOrderStatus);

// Assign rider to order (sellers only)
router.put('/:id/assign-rider', auth, authorize('seller'), [
  body('riderId').notEmpty().withMessage('Rider ID is required')
], assignRider);

module.exports = router;