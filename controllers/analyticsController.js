const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const getSellerAnalytics = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { period = '30' } = req.query; // days
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Total sales
    const totalSales = await Order.aggregate([
      {
        $match: {
          seller: sellerId,
          status: 'delivered',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    // Sales by day
    const salesByDay = await Order.aggregate([
      {
        $match: {
          seller: sellerId,
          status: 'delivered',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top products
    const topProducts = await Order.aggregate([
      { $match: { seller: sellerId, status: 'delivered' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    // Order status distribution
    const orderStatus = await Order.aggregate([
      { $match: { seller: sellerId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      analytics: {
        summary: totalSales[0] || { totalRevenue: 0, totalOrders: 0 },
        salesByDay,
        topProducts,
        orderStatus
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRiderAnalytics = async (req, res) => {
  try {
    const riderId = req.user.id;
    const { period = '30' } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Delivery stats
    const deliveryStats = await Order.aggregate([
      {
        $match: {
          rider: riderId,
          status: 'delivered',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$deliveryFee' },
          totalDeliveries: { $sum: 1 },
          avgDeliveryTime: { $avg: { $subtract: ['$actualDeliveryTime', '$createdAt'] } }
        }
      }
    ]);

    // Deliveries by day
    const deliveriesByDay = await Order.aggregate([
      {
        $match: {
          rider: riderId,
          status: 'delivered',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          deliveries: { $sum: 1 },
          earnings: { $sum: '$deliveryFee' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      analytics: {
        summary: deliveryStats[0] || { totalEarnings: 0, totalDeliveries: 0, avgDeliveryTime: 0 },
        deliveriesByDay
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminAnalytics = async (req, res) => {
  try {
    // Platform overview
    const platformStats = await Promise.all([
      User.countDocuments({ role: 'buyer' }),
      User.countDocuments({ role: 'seller' }),
      User.countDocuments({ role: 'rider' }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
      ])
    ]);

    // Recent activity
    const recentOrders = await Order.find()
      .populate('buyer', 'name')
      .populate('seller', 'name businessName')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      analytics: {
        users: {
          buyers: platformStats[0],
          sellers: platformStats[1],
          riders: platformStats[2]
        },
        products: platformStats[3],
        orders: platformStats[4],
        revenue: platformStats[5][0]?.totalRevenue || 0,
        recentOrders
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSellerAnalytics,
  getRiderAnalytics,
  getAdminAnalytics
};