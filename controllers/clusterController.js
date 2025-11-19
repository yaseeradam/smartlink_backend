const RiderCluster = require('../models/RiderCluster');
const User = require('../models/User');
const Order = require('../models/Order');

const createCluster = async (req, res) => {
  try {
    const { name, location, serviceAreas, vehicleTypes, operatingHours, backupContactId } = req.body;

    // Verify user is a rider
    const leader = await User.findById(req.user.id);
    if (leader.role !== 'rider') {
      return res.status(403).json({ message: 'Only riders can create clusters' });
    }

    // Check if leader already has a cluster
    const existingCluster = await RiderCluster.findOne({ leader: req.user.id });
    if (existingCluster) {
      return res.status(400).json({ message: 'You already lead a cluster' });
    }

    const cluster = await RiderCluster.create({
      name,
      location,
      leader: req.user.id,
      backupContact: backupContactId,
      members: [{
        rider: req.user.id,
        isLeader: true,
        isActive: true
      }],
      serviceAreas,
      vehicleTypes,
      operatingHours
    });

    await cluster.populate([
      { path: 'leader', select: 'name phone vehicleType' },
      { path: 'members.rider', select: 'name phone vehicleType' }
    ]);

    res.status(201).json({ success: true, cluster });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClusters = async (req, res) => {
  try {
    const { location, serviceArea, isOnline, page = 1, limit = 20 } = req.query;

    let query = { subscriptionStatus: 'active' };

    if (isOnline !== undefined) query.isOnline = isOnline === 'true';
    if (serviceArea) query.serviceAreas = { $in: [serviceArea] };
    if (location) query.$text = { $search: location };

    const clusters = await RiderCluster.find(query)
      .populate('leader', 'name phone vehicleType')
      .populate('backupContact', 'name phone')
      .populate('members.rider', 'name phone vehicleType')
      .sort({ 'rating.average': -1, totalDeliveries: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RiderCluster.countDocuments(query);

    res.json({
      success: true,
      clusters,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCluster = async (req, res) => {
  try {
    const cluster = await RiderCluster.findById(req.params.id)
      .populate('leader', 'name phone vehicleType location')
      .populate('backupContact', 'name phone')
      .populate('members.rider', 'name phone vehicleType');

    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    res.json({ success: true, cluster });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCluster = async (req, res) => {
  try {
    const cluster = await RiderCluster.findById(req.params.id);

    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    if (cluster.leader.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only cluster leader can update' });
    }

    const allowedUpdates = ['name', 'location', 'serviceAreas', 'vehicleTypes', 'operatingHours', 'isOnline', 'backupContact'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedCluster = await RiderCluster.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('leader', 'name phone')
     .populate('members.rider', 'name phone vehicleType');

    res.json({ success: true, cluster: updatedCluster });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addMember = async (req, res) => {
  try {
    const { riderId } = req.body;
    const cluster = await RiderCluster.findById(req.params.id);

    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    if (cluster.leader.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only cluster leader can add members' });
    }

    // Check if rider exists and is a rider
    const rider = await User.findById(riderId);
    if (!rider || rider.role !== 'rider') {
      return res.status(400).json({ message: 'Invalid rider' });
    }

    // Check if already a member
    const isMember = cluster.members.some(m => m.rider.toString() === riderId);
    if (isMember) {
      return res.status(400).json({ message: 'Rider is already a member' });
    }

    cluster.members.push({
      rider: riderId,
      isLeader: false,
      isActive: true
    });

    await cluster.save();
    await cluster.populate('members.rider', 'name phone vehicleType');

    res.json({ success: true, cluster });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeMember = async (req, res) => {
  try {
    const { riderId } = req.body;
    const cluster = await RiderCluster.findById(req.params.id);

    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    if (cluster.leader.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only cluster leader can remove members' });
    }

    // Can't remove leader
    if (riderId === cluster.leader.toString()) {
      return res.status(400).json({ message: 'Cannot remove cluster leader' });
    }

    cluster.members = cluster.members.filter(m => m.rider.toString() !== riderId);
    await cluster.save();

    res.json({ success: true, cluster });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const assignOrderToCluster = async (req, res) => {
  try {
    const { orderId, specificRiderId } = req.body;
    const cluster = await RiderCluster.findById(req.params.id);

    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify seller owns the order
    if (order.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Assign to specific rider or cluster leader
    const riderId = specificRiderId || cluster.leader;
    order.rider = riderId;
    order.status = 'assigned';
    await order.save();

    // Update cluster stats
    cluster.totalDeliveries += 1;
    
    // Update member stats
    const memberIndex = cluster.members.findIndex(m => m.rider.toString() === riderId.toString());
    if (memberIndex !== -1) {
      cluster.members[memberIndex].deliveries += 1;
    }
    
    await cluster.save();

    res.json({ success: true, order, cluster });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClusterStats = async (req, res) => {
  try {
    const cluster = await RiderCluster.findById(req.params.id);

    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    // Get orders assigned to cluster members
    const memberIds = cluster.members.map(m => m.rider);
    const orders = await Order.find({
      rider: { $in: memberIds },
      status: 'delivered'
    });

    const totalEarnings = orders.reduce((sum, order) => sum + order.deliveryFee, 0);
    const completedDeliveries = orders.length;

    res.json({
      success: true,
      stats: {
        totalMembers: cluster.members.length,
        activeMembers: cluster.members.filter(m => m.isActive).length,
        totalDeliveries: cluster.totalDeliveries,
        completedDeliveries,
        totalEarnings,
        averageRating: cluster.rating.average,
        ratingCount: cluster.rating.count
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCluster,
  getClusters,
  getCluster,
  updateCluster,
  addMember,
  removeMember,
  assignOrderToCluster,
  getClusterStats
};