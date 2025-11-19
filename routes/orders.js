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

// Cancel order (buyers only)
router.put('/:id/cancel', auth, authorize('buyer'), [
  body('reason').notEmpty().withMessage('Cancellation reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason, confirmPassword } = req.body;
    const orderId = req.params.id;

    // Find order and verify ownership
    const order = await Order.findById(orderId);
    if (!order || order.buyer._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Order not found or not authorized' });
    }

    // Update order status to cancelled
    order.status = 'cancelled';
    order.cancellationRequestedAt = new Date();
    order.cancellationReason = reason;

    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order: order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Request order modification (buyers and sellers)
router.put('/:id/modify', auth, authorize('buyer', 'seller'), [
  body('requestedModification').notEmpty().withMessage('Modification details are required'),
  body('modificationReason').notEmpty().withMessage('Modification reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { requestedModification, modificationReason } = req.body;
    const orderId = req.params.id;

    // Find order and verify ownership
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const userRole = req.user.role;
    const isAuthorized = (userRole === 'buyer' && order.buyer._id.toString() === req.user.id) ||
                        (userRole === 'seller' && order.seller.toString() === req.user.id);

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to modify this order' });
    }

    // Update order with modification request
    order.modificationRequestedAt = new Date();
    order.modificationReason = modificationReason;
    order.requestedModification = requestedModification;

    await order.save();

    res.json({
      success: true,
      message: 'Modification request submitted successfully',
      order: order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get order history with advanced filtering
router.get('/user/:userId/history', auth, authorize('buyer'), [
  // Optional query parameters for filtering
],
 async (req, res) => {
  try {
    const { status, dateFrom, dateTo, search } = req.query;

    let query = { user: req.params.userId };
    if (status) query.status = status;
    if (dateFrom) query.dateFrom = dateFrom;
    if (dateTo) query.dateTo = dateTo;
    if (search) query.search = search;

    const orders = await Order.find(query)
      .populate('buyer', 'name phone location')
      .populate('seller', 'name businessName phone location')
      .populate('items.product', 'name price images')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders: orders,
      totalCount: orders.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;