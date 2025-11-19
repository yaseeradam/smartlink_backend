const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = (io) => {
  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error'));
      }
      
      socket.userId = user._id.toString();
      socket.userRole = user.role;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);

    // Join user to their personal room
    socket.join(socket.userId);

    // Join riders to rider room for order broadcasts
    if (socket.userRole === 'rider') {
      socket.join('riders');
    }

    // Handle rider location updates
    socket.on('updateLocation', (data) => {
      if (socket.userRole === 'rider') {
        // Broadcast location to relevant orders
        socket.broadcast.emit('riderLocationUpdate', {
          riderId: socket.userId,
          location: data.location
        });
      }
    });

    // Handle order status updates
    socket.on('orderStatusUpdate', (data) => {
      const { orderId, status, buyerId, sellerId, riderId } = data;
      
      // Notify all parties involved in the order
      [buyerId, sellerId, riderId].forEach(userId => {
        if (userId) {
          io.to(userId).emit('orderUpdate', {
            orderId,
            status,
            timestamp: new Date()
          });
        }
      });
    });

    // Handle new order notifications
    socket.on('newOrder', (data) => {
      // Notify available riders about new order
      socket.to('riders').emit('newOrderAvailable', data);
    });

    // Handle chat messages (future feature)
    socket.on('sendMessage', (data) => {
      const { recipientId, message } = data;
      io.to(recipientId).emit('newMessage', {
        senderId: socket.userId,
        message,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });
};