const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// Socket.io store for real-time notifications
let io;

const initializeSocketIO = (socketIO) => {
  io = socketIO;
};

// Helper function to emit real-time notifications
const emitNotification = (userId, eventName, data) => {
  if (io) {
    io.to(userId).emit(eventName, data);
  }
};

const createOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, paymentMethod, notes } = req.body;
    
    let totalAmount = 0;
    const orderItems = [];

    // Validate items and calculate total
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Product ${product?.name || 'not found'} is out of stock` 
        });
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Get seller from first product
    const firstProduct = await Product.findById(items[0].product);
    
    const order = await Order.create({
      buyer: req.user.id,
      seller: firstProduct.seller,
      items: orderItems,
      totalAmount,
      deliveryAddress,
      paymentMethod,
      notes
    });

    // Update product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    await order.populate([
      { path: 'buyer', select: 'name phone' },
      { path: 'seller', select: 'name businessName phone' },
      { path: 'items.product', select: 'name price images' }
    ]);

    // Send real-time notification to seller
    emitNotification(firstProduct.seller.toString(), 'newOrder', {
      order: order,
      message: `New order #${order._id.toString().substring(0, 8)} received`,
      buyerName: order.buyer.name,
      totalAmount: order.totalAmount
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrders = async (req, res) => {
  try {
    const { status, role = req.user.role } = req.query;
    
    let query = {};
    
    if (role === 'buyer') query.buyer = req.user.id;
    if (role === 'seller') query.seller = req.user.id;
    if (role === 'rider') query.rider = req.user.id;
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('buyer', 'name phone location')
      .populate('seller', 'name businessName phone location')
      .populate('rider', 'name phone vehicleType')
      .populate('items.product', 'name price images')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'name phone location')
      .populate('seller', 'name businessName phone location')
      .populate('rider', 'name phone vehicleType')
      .populate('items.product', 'name price images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const userId = req.user.id;
    if (order.buyer._id.toString() !== userId && 
        order.seller._id.toString() !== userId && 
        order.rider?._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status, location, note } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Authorization check based on role and status
    const userRole = req.user.role;
    const userId = req.user.id;
    
    if (userRole === 'seller' && order.seller.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (userRole === 'rider' && order.rider?.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    order.status = status;
    
    // Add to tracking history
    order.trackingHistory.push({
      status,
      location,
      note
    });

    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
    }

    await order.save();
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const assignRider = async (req, res) => {
  try {
    const { riderId } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const rider = await User.findById(riderId);
    if (!rider || rider.role !== 'rider') {
      return res.status(400).json({ message: 'Invalid rider' });
    }

    order.rider = riderId;
    order.status = 'assigned';
    await order.save();

    await order.populate('rider', 'name phone vehicleType');
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  assignRider,
  initializeSocketIO
};