const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get available riders (sellers only)
router.get('/available', auth, authorize('seller'), async (req, res) => {
  try {
    const riders = await User.find({
      role: 'rider',
      isAvailable: true,
      isActive: true
    }).select('name phone vehicleType location');

    res.json({ success: true, riders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update rider availability (riders only)
router.put('/availability', auth, authorize('rider'), async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    await User.findByIdAndUpdate(req.user.id, { isAvailable });
    
    res.json({ success: true, message: 'Availability updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get rider deliveries (riders only)
router.get('/deliveries', auth, authorize('rider'), async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = { rider: req.user.id };
    if (status) query.status = status;

    const deliveries = await Order.find(query)
      .populate('buyer', 'name phone location')
      .populate('seller', 'name businessName phone location')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 });

    res.json({ success: true, deliveries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get rider earnings (riders only)
router.get('/earnings', auth, authorize('rider'), async (req, res) => {
  try {
    const deliveredOrders = await Order.find({
      rider: req.user.id,
      status: 'delivered'
    });

    const totalEarnings = deliveredOrders.reduce((sum, order) => sum + order.deliveryFee, 0);
    const totalDeliveries = deliveredOrders.length;

    res.json({
      success: true,
      earnings: {
        total: totalEarnings,
        deliveries: totalDeliveries,
        average: totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;