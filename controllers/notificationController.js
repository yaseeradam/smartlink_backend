const Notification = require('../models/Notification');

const createNotification = async (recipientId, type, title, message, data = {}) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      data
    });
    
    // Emit real-time notification via socket
    const io = require('../server').io;
    if (io) {
      io.to(recipientId.toString()).emit('newNotification', notification);
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const query = { recipient: req.user.id };
    if (unreadOnly === 'true') query.isRead = false;

    const notifications = await Notification.find(query)
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(notifications.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        recipient: req.user.id
      },
      { isRead: true }
    );

    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Notification helpers
const notifyOrderUpdate = async (orderId, buyerId, sellerId, riderId, status) => {
  const messages = {
    confirmed: 'Your order has been confirmed',
    preparing: 'Your order is being prepared',
    ready: 'Your order is ready for pickup',
    assigned: 'A rider has been assigned to your order',
    picked_up: 'Your order has been picked up',
    in_transit: 'Your order is on the way',
    delivered: 'Your order has been delivered'
  };

  const title = 'Order Update';
  const message = messages[status] || 'Your order status has been updated';

  // Notify buyer
  if (buyerId) {
    await createNotification(buyerId, 'order_update', title, message, { orderId, status });
  }

  // Notify seller
  if (sellerId && status === 'delivered') {
    await createNotification(sellerId, 'order_update', 'Order Completed', 'An order has been completed', { orderId, status });
  }
};

const notifyNewOrder = async (sellerId, orderId, buyerName) => {
  await createNotification(
    sellerId,
    'new_order',
    'New Order Received',
    `You have a new order from ${buyerName}`,
    { orderId }
  );
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  notifyOrderUpdate,
  notifyNewOrder
};