const mongoose = require('mongoose');

const clusterMemberSchema = new mongoose.Schema({
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isLeader: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  deliveries: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  }
});

const riderClusterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  backupContact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  members: [clusterMemberSchema],
  isOnline: {
    type: Boolean,
    default: true
  },
  rating: {
    average: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  operatingHours: {
    type: String,
    default: '6AM - 10PM'
  },
  serviceAreas: [{
    type: String
  }],
  vehicleTypes: [{
    type: String,
    enum: ['motorcycle', 'bicycle', 'car']
  }],
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  subscriptionExpiry: Date,
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
riderClusterSchema.index({ 'location.address': 'text', name: 'text' });
riderClusterSchema.index({ serviceAreas: 1 });
riderClusterSchema.index({ isOnline: 1, subscriptionStatus: 1 });

module.exports = mongoose.model('RiderCluster', riderClusterSchema);